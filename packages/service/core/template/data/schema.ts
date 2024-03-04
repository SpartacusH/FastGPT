import { connectionMongo, type Model } from '../../../common/mongo';
const { Schema, model, models } = connectionMongo;
import { TemplateDataSchemaType } from '@fastgpt/global/core/template/type.d';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { TemplateCollectionName } from '../schema';
import { TemplateColCollectionName } from '../collection/schema';
import {
  TemplateDataIndexTypeEnum,
  TemplateDataIndexTypeMap
} from '@fastgpt/global/core/template/constants';

export const TemplateDataCollectionName = 'template.datas';

const TemplateDataSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: TemplateCollectionName,
    required: true
  },
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: TemplateColCollectionName,
    required: true
  },
  q: {
    type: String,
    required: true
  },
  a: {
    type: String,
    default: ''
  },
  fullTextToken: {
    type: String,
    default: ''
  },
  indexes: {
    type: [
      {
        defaultIndex: {
          type: Boolean,
          default: false
        },
        type: {
          type: String,
          enum: Object.keys(TemplateDataIndexTypeMap),
          default: TemplateDataIndexTypeEnum.custom
        },
        dataId: {
          type: String,
          required: true
        },
        text: {
          type: String,
          required: true
        }
      }
    ],
    default: []
  },

  updateTime: {
    type: Date,
    default: () => new Date()
  },
  chunkIndex: {
    type: Number,
    default: 0
  },
  inited: {
    type: Boolean
  }
});

try {
  // list collection and count data; list data
  TemplateDataSchema.index(
    { teamId: 1, templateId: 1, collectionId: 1, chunkIndex: 1, updateTime: -1 },
    { background: true }
  );
  // same data check
  TemplateDataSchema.index({ teamId: 1, collectionId: 1, q: 1, a: 1 }, { background: true });
  // full text index
  TemplateDataSchema.index({ teamId: 1, templateId: 1, fullTextToken: 'text' }, { background: true });
  // Recall vectors after data matching
  TemplateDataSchema.index({ teamId: 1, templateId: 1, 'indexes.dataId': 1 }, { background: true });
  TemplateDataSchema.index({ updateTime: 1 }, { background: true });
} catch (error) {
  console.log(error);
}

export const MongoTemplateData: Model<TemplateDataSchemaType> =
  models[TemplateDataCollectionName] || model(TemplateDataCollectionName, TemplateDataSchema);
MongoTemplateData.syncIndexes();
