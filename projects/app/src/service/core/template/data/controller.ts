import { MongoTemplateData } from '@fastgpt/service/core/template/data/schema';
import {
  CreateTemplateDataProps,
  PatchIndexesProps,
  UpdateTemplateDataProps
} from '@fastgpt/global/core/template/controller';
import {
  insertTemplateDataVector,
  recallFromVectorStore,
  updateTemplateDataVector
} from '@fastgpt/service/common/vectorStore/controller';
import {
  TemplateDataIndexTypeEnum,
  TemplateSearchModeEnum,
  TemplateSearchModeMap,
  SearchScoreTypeEnum
} from '@fastgpt/global/core/template/constants';
import { templateSearchResultConcat } from '@fastgpt/global/core/template/search/utils';
import { getDefaultIndex } from '@fastgpt/global/core/template/utils';
import { jiebaSplit } from '@/service/common/string/jieba';
import { deleteTemplateDataVector } from '@fastgpt/service/common/vectorStore/controller';
import { getVectorsByText } from '@fastgpt/service/core/ai/embedding';
import { MongoTemplateCollection } from '@fastgpt/service/core/template/collection/schema';
import {
  TemplateDataSchemaType,
  TemplateDataWithCollectionType,
  SearchDataResponseItemType
} from '@fastgpt/global/core/template/type';
import { reRankRecall } from '../../ai/rerank';
import { countPromptTokens } from '@fastgpt/global/common/string/tiktoken';
import { hashStr } from '@fastgpt/global/common/string/tools';
import type {
  PushTemplateDataProps,
  PushTemplateDataResponse
} from '@fastgpt/global/core/template/api.d';
import { pushDataListToTrainingQueue } from '@fastgpt/service/core/template/training/controller';
import { getVectorModel } from '../../ai/model';
import { ModuleInputKeyEnum } from '@fastgpt/global/core/module/constants';

export async function pushDataToTrainingQueue(
  props: {
    teamId: string;
    tmbId: string;
  } & PushTemplateDataProps
): Promise<PushTemplateDataResponse> {
  const result = await pushDataListToTrainingQueue({
    ...props,
    vectorModelList: global.vectorModels,
    templateModelList: global.llmModels
  });

  return result;
}

/* insert data.
 * 1. create data id
 * 2. insert pg
 * 3. create mongo data
 */
export async function insertData2Template({
  teamId,
  tmbId,
  templateId,
  collectionId,
  q,
  a = '',
  chunkIndex = 0,
  indexes,
  model
}: CreateTemplateDataProps & {
  model: string;
}) {
  if (!q || !templateId || !collectionId || !model) {
    console.log(q, a, templateId, collectionId, model);
    return Promise.reject('q, templateId, collectionId, model is required');
  }
  if (String(teamId) === String(tmbId)) {
    return Promise.reject("teamId and tmbId can't be the same");
  }

  const qaStr = `${q}\n${a}`.trim();

  // empty indexes check, if empty, create default index
  indexes =
    Array.isArray(indexes) && indexes.length > 0
      ? indexes.map((index) => ({
          ...index,
          dataId: undefined,
          defaultIndex: indexes?.length === 1 && index.text === qaStr ? true : index.defaultIndex
        }))
      : [getDefaultIndex({ q, a })];

  // insert to vector store
  const result = await Promise.all(
    indexes.map((item) =>
      insertTemplateDataVector({
        query: item.text,
        model: getVectorModel(model),
        teamId,
        // @ts-ignore
        templateId,
        collectionId
      })
    )
  );

  // create mongo data
  const { _id } = await MongoTemplateData.create({
    teamId,
    tmbId,
    templateId,
    collectionId,
    q,
    a,
    fullTextToken: jiebaSplit({ text: qaStr }),
    chunkIndex,
    indexes: indexes.map((item, i) => ({
      ...item,
      dataId: result[i].insertId
    }))
  });

  return {
    insertId: _id,
    charsLength: result.reduce((acc, cur) => acc + cur.charsLength, 0)
  };
}

/**
 * update data
 * 1. compare indexes
 * 2. update pg data
 * 3. update mongo data
 */
export async function updateData2Template({
  dataId,
  q,
  a,
  indexes,
  model
}: UpdateTemplateDataProps & { model: string }) {
  if (!Array.isArray(indexes)) {
    return Promise.reject('indexes is required');
  }
  const qaStr = `${q}\n${a}`.trim();

  // patch index and update pg
  const mongoData = await MongoTemplateData.findById(dataId);
  if (!mongoData) return Promise.reject('core.template.error.Data not found');

  // make sure have one index
  if (indexes.length === 0) {
    const databaseDefaultIndex = mongoData.indexes.find((index) => index.defaultIndex);

    indexes = [
      getDefaultIndex({
        q,
        a,
        dataId: databaseDefaultIndex ? String(databaseDefaultIndex.dataId) : undefined
      })
    ];
  }

  // patch indexes, create, update, delete
  const patchResult: PatchIndexesProps[] = [];

  // find database indexes in new Indexes, if have not,  delete it
  for (const item of mongoData.indexes) {
    const index = indexes.find((index) => index.dataId === item.dataId);
    if (!index) {
      patchResult.push({
        type: 'delete',
        index: item
      });
    }
  }
  for (const item of indexes) {
    const index = mongoData.indexes.find((index) => index.dataId === item.dataId);
    // in database, update
    if (index) {
      // manual update index
      if (index.text !== item.text) {
        patchResult.push({
          type: 'update',
          index: item
        });
      } else if (index.defaultIndex && index.text !== qaStr) {
        // update default index
        patchResult.push({
          type: 'update',
          index: {
            ...item,
            type:
              item.type === TemplateDataIndexTypeEnum.qa && !a
                ? TemplateDataIndexTypeEnum.chunk
                : item.type,
            text: qaStr
          }
        });
      } else {
        patchResult.push({
          type: 'unChange',
          index: item
        });
      }
    } else {
      // not in database, create
      patchResult.push({
        type: 'create',
        index: item
      });
    }
  }

  // update mongo updateTime
  mongoData.updateTime = new Date();
  await mongoData.save();

  // update vector
  const result = await Promise.all(
    patchResult.map(async (item) => {
      if (item.type === 'create') {
        const result = await insertTemplateDataVector({
          query: item.index.text,
          model: getVectorModel(model),
          teamId: mongoData.teamId,
          // @ts-ignore
          templateId: mongoData.templateId,
          collectionId: mongoData.collectionId
        });
        item.index.dataId = result.insertId;
        return result;
      }
      if (item.type === 'update' && item.index.dataId) {
        const result = await updateTemplateDataVector({
          teamId: mongoData.teamId,
          // @ts-ignore
          templateId: mongoData.templateId,
          collectionId: mongoData.collectionId,
          id: item.index.dataId,
          query: item.index.text,
          model: getVectorModel(model)
        });
        item.index.dataId = result.insertId;

        return result;
      }
      if (item.type === 'delete' && item.index.dataId) {
        await deleteTemplateDataVector({
          teamId: mongoData.teamId,
          id: item.index.dataId
        });
        return {
          charsLength: 0
        };
      }
      return {
        charsLength: 0
      };
    })
  );

  const charsLength = result.reduce((acc, cur) => acc + cur.charsLength, 0);
  const newIndexes = patchResult.filter((item) => item.type !== 'delete').map((item) => item.index);

  // update mongo other data
  mongoData.q = q || mongoData.q;
  mongoData.a = a ?? mongoData.a;
  mongoData.fullTextToken = jiebaSplit({ text: mongoData.q + mongoData.a });
  // @ts-ignore
  mongoData.indexes = newIndexes;
  await mongoData.save();

  return {
    charsLength
  };
}

type SearchTemplateDataProps = {
  teamId: string;
  model: string;
  similarity?: number; // min distance
  limit: number; // max Token limit
  templateIds: string[];
  searchMode?: `${TemplateSearchModeEnum}`;
  usingReRank?: boolean;
  reRankQuery: string;
  queries: string[];
};

export async function searchTemplateData(props: SearchTemplateDataProps) {
  let {
    teamId,
    reRankQuery,
    queries,
    model,
    similarity = 0,
    limit: maxTokens,
    searchMode = TemplateSearchModeEnum.embedding,
    usingReRank = false,
    templateIds = []
  } = props;

  /* init params */
  searchMode = TemplateSearchModeMap[searchMode] ? searchMode : TemplateSearchModeEnum.embedding;
  usingReRank = usingReRank && global.reRankModels.length > 0;

  // Compatible with topk limit
  if (maxTokens < 50) {
    maxTokens = 1500;
  }
  let set = new Set<string>();
  let usingSimilarityFilter = false;

  /* function */
  const countRecallLimit = () => {
    if (searchMode === TemplateSearchModeEnum.embedding) {
      return {
        embeddingLimit: 100,
        fullTextLimit: 0
      };
    }
    if (searchMode === TemplateSearchModeEnum.fullTextRecall) {
      return {
        embeddingLimit: 0,
        fullTextLimit: 100
      };
    }
    return {
      embeddingLimit: 60,
      fullTextLimit: 40
    };
  };
  const embeddingRecall = async ({ query, limit }: { query: string; limit: number }) => {
    const { vectors, charsLength } = await getVectorsByText({
      model: getVectorModel(model),
      input: query
    });

    const { results } = await recallFromVectorStore({
      vectors,
      limit,
      // @ts-ignore
      templateIds,
      efSearch: global.systemEnv?.pgHNSWEfSearch
    });

    // get q and a
    const dataList = (await MongoTemplateData.find(
      {
        teamId,
        templateId: { $in: templateIds },
        'indexes.dataId': { $in: results.map((item) => item.id?.trim()) }
      },
      'templateId collectionId q a chunkIndex indexes'
    )
      .populate('collectionId', 'name fileId rawLink')
      .lean()) as TemplateDataWithCollectionType[];

    // add score to data(It's already sorted. The first one is the one with the most points)
    const concatResults = dataList.map((data) => {
      const dataIdList = data.indexes.map((item) => item.dataId);

      const maxScoreResult = results.find((item) => {
        return dataIdList.includes(item.id);
      });

      return {
        ...data,
        score: maxScoreResult?.score || 0
      };
    });

    concatResults.sort((a, b) => b.score - a.score);

    const formatResult = concatResults
      .map((data, index) => {
        const result: SearchDataResponseItemType = {
          id: String(data._id),
          q: data.q,
          a: data.a,
          chunkIndex: data.chunkIndex,
          templateId: String(data.templateId),
          collectionId: String(data.collectionId._id),
          sourceName: data.collectionId.name || '',
          sourceId: data.collectionId?.fileId || data.collectionId?.rawLink,
          score: [{ type: SearchScoreTypeEnum.embedding, value: data.score, index }]
        };

        return result;
      })
      .filter((item) => item !== null) as SearchDataResponseItemType[];

    return {
      embeddingRecallResults: formatResult,
      charsLength
    };
  };
  const fullTextRecall = async ({
    query,
    limit
  }: {
    query: string;
    limit: number;
  }): Promise<{
    fullTextRecallResults: SearchDataResponseItemType[];
    tokenLen: number;
  }> => {
    if (limit === 0) {
      return {
        fullTextRecallResults: [],
        tokenLen: 0
      };
    }

    let searchResults = (
      await Promise.all(
        templateIds.map((id) =>
          MongoTemplateData.find(
            {
              teamId,
              templateId: id,
              $text: { $search: jiebaSplit({ text: query }) }
            },
            {
              score: { $meta: 'textScore' },
              _id: 1,
              templateId: 1,
              collectionId: 1,
              q: 1,
              a: 1,
              chunkIndex: 1
            }
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean()
        )
      )
    ).flat() as (TemplateDataSchemaType & { score: number })[];

    // resort
    searchResults.sort((a, b) => b.score - a.score);
    searchResults.slice(0, limit);

    const collections = await MongoTemplateCollection.find(
      {
        _id: { $in: searchResults.map((item) => item.collectionId) }
      },
      '_id name fileId rawLink'
    );

    return {
      fullTextRecallResults: searchResults.map((item, index) => {
        const collection = collections.find((col) => String(col._id) === String(item.collectionId));
        return {
          id: String(item._id),
          templateId: String(item.templateId),
          collectionId: String(item.collectionId),
          sourceName: collection?.name || '',
          sourceId: collection?.fileId || collection?.rawLink,
          q: item.q,
          a: item.a,
          chunkIndex: item.chunkIndex,
          indexes: item.indexes,
          score: [{ type: SearchScoreTypeEnum.fullText, value: item.score, index }]
        };
      }),
      tokenLen: 0
    };
  };
  const reRankSearchResult = async ({
    data,
    query
  }: {
    data: SearchDataResponseItemType[];
    query: string;
  }): Promise<SearchDataResponseItemType[]> => {
    try {
      const results = await reRankRecall({
        query,
        inputs: data.map((item) => ({
          id: item.id,
          text: `${item.q}\n${item.a}`
        }))
      });

      if (!Array.isArray(results)) {
        usingReRank = false;
        return [];
      }

      // add new score to data
      const mergeResult = results
        .map((item, index) => {
          const target = data.find((dataItem) => dataItem.id === item.id);
          if (!target) return null;
          const score = item.score || 0;

          return {
            ...target,
            score: [{ type: SearchScoreTypeEnum.reRank, value: score, index }]
          };
        })
        .filter(Boolean) as SearchDataResponseItemType[];

      return mergeResult;
    } catch (error) {
      usingReRank = false;
      return [];
    }
  };
  const filterResultsByMaxTokens = (list: SearchDataResponseItemType[], maxTokens: number) => {
    const results: SearchDataResponseItemType[] = [];
    let totalTokens = 0;

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      totalTokens += countPromptTokens(item.q + item.a);
      if (totalTokens > maxTokens + 500) {
        break;
      }
      results.push(item);
      if (totalTokens > maxTokens) {
        break;
      }
    }

    return results.length === 0 ? list.slice(0, 1) : results;
  };
  const multiQueryRecall = async ({
    embeddingLimit,
    fullTextLimit
  }: {
    embeddingLimit: number;
    fullTextLimit: number;
  }) => {
    // multi query recall
    const embeddingRecallResList: SearchDataResponseItemType[][] = [];
    const fullTextRecallResList: SearchDataResponseItemType[][] = [];
    let totalCharsLength = 0;

    await Promise.all(
      queries.map(async (query) => {
        const [{ charsLength, embeddingRecallResults }, { fullTextRecallResults }] =
          await Promise.all([
            embeddingRecall({
              query,
              limit: embeddingLimit
            }),
            fullTextRecall({
              query,
              limit: fullTextLimit
            })
          ]);
        totalCharsLength += charsLength;

        embeddingRecallResList.push(embeddingRecallResults);
        fullTextRecallResList.push(fullTextRecallResults);
      })
    );

    // rrf concat
    const rrfEmbRecall = templateSearchResultConcat(
      embeddingRecallResList.map((list) => ({ k: 60, list }))
    ).slice(0, embeddingLimit);
    const rrfFTRecall = templateSearchResultConcat(
      fullTextRecallResList.map((list) => ({ k: 60, list }))
    ).slice(0, fullTextLimit);

    return {
      charsLength: totalCharsLength,
      embeddingRecallResults: rrfEmbRecall,
      fullTextRecallResults: rrfFTRecall
    };
  };

  /* main step */
  // count limit
  const { embeddingLimit, fullTextLimit } = countRecallLimit();

  // recall
  const { embeddingRecallResults, fullTextRecallResults, charsLength } = await multiQueryRecall({
    embeddingLimit,
    fullTextLimit
  });

  // ReRank results
  const reRankResults = await (async () => {
    if (!usingReRank) return [];

    set = new Set<string>(embeddingRecallResults.map((item) => item.id));
    const concatRecallResults = embeddingRecallResults.concat(
      fullTextRecallResults.filter((item) => !set.has(item.id))
    );

    // remove same q and a data
    set = new Set<string>();
    const filterSameDataResults = concatRecallResults.filter((item) => {
      // 删除所有的标点符号与空格等，只对文本进行比较
      const str = hashStr(`${item.q}${item.a}`.replace(/[^\p{L}\p{N}]/gu, ''));
      if (set.has(str)) return false;
      set.add(str);
      return true;
    });
    return reRankSearchResult({
      query: reRankQuery,
      data: filterSameDataResults
    });
  })();

  // embedding recall and fullText recall rrf concat
  const rrfConcatResults = templateSearchResultConcat([
    { k: 60, list: embeddingRecallResults },
    { k: 64, list: fullTextRecallResults },
    { k: 60, list: reRankResults }
  ]);

  // remove same q and a data
  set = new Set<string>();
  const filterSameDataResults = rrfConcatResults.filter((item) => {
    // 删除所有的标点符号与空格等，只对文本进行比较
    const str = hashStr(`${item.q}${item.a}`.replace(/[^\p{L}\p{N}]/gu, ''));
    if (set.has(str)) return false;
    set.add(str);
    return true;
  });

  // score filter
  const scoreFilter = (() => {
    if (usingReRank) {
      usingSimilarityFilter = true;

      return filterSameDataResults.filter((item) => {
        const reRankScore = item.score.find((item) => item.type === SearchScoreTypeEnum.reRank);
        if (reRankScore && reRankScore.value < similarity) return false;
        return true;
      });
    }
    if (searchMode === TemplateSearchModeEnum.embedding) {
      usingSimilarityFilter = true;
      return filterSameDataResults.filter((item) => {
        const embeddingScore = item.score.find(
          (item) => item.type === SearchScoreTypeEnum.embedding
        );
        if (embeddingScore && embeddingScore.value < similarity) return false;
        return true;
      });
    }
    return filterSameDataResults;
  })();

  return {
    searchRes: filterResultsByMaxTokens(scoreFilter, maxTokens),
    charsLength,
    searchMode,
    limit: maxTokens,
    similarity,
    usingReRank,
    usingSimilarityFilter
  };
}
