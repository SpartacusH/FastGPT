import { CollectionWithTemplateType, TemplateSchemaType } from '@fastgpt/global/core/template/type';
import { MongoTemplateCollection } from './collection/schema';
import { MongoTemplate } from './schema';
import { delCollectionAndRelatedSources } from './collection/controller';
import { ClientSession } from '../../common/mongo';

/* ============= template ========== */
/* find all templateId by top templateId */
export async function findTemplateAndAllChildren({
  teamId,
  templateId,
  fields
}: {
  teamId: string;
  templateId: string;
  fields?: string;
}): Promise<TemplateSchemaType[]> {
  const find = async (id: string) => {
    const children = await MongoTemplate.find(
      {
        teamId,
        parentId: id
      },
      fields
    ).lean();

    let templates = children;

    for (const child of children) {
      const grandChildrenIds = await find(child._id);
      templates = templates.concat(grandChildrenIds);
    }

    return templates;
  };
  const [template, childTemplates] = await Promise.all([
    MongoTemplate.findById(templateId),
    find(templateId)
  ]);

  if (!template) {
    return Promise.reject('Template not found');
  }

  return [template, ...childTemplates];
}

export async function getCollectionWithTemplate(collectionId: string) {
  const data = (await MongoTemplateCollection.findById(collectionId)
    .populate('templateId')
    .lean()) as CollectionWithTemplateType;
  if (!data) {
    return Promise.reject('Collection is not exist');
  }
  return data;
}

/* delete all data by templateIds */
export async function delTemplateRelevantData({
  templates,
  session
}: {
  templates: TemplateSchemaType[];
  session: ClientSession;
}) {
  if (!templates.length) return;

  const teamId = templates[0].teamId;
  const templateIds = templates.map((item) => String(item._id));

  // Get _id, teamId, fileId, metadata.relatedImgId for all collections
  const collections = await MongoTemplateCollection.find(
    {
      teamId,
      templateId: { $in: templateIds }
    },
    '_id teamId fileId metadata'
  ).lean();

  await delCollectionAndRelatedSources({ collections, session });
}
