import { connectionMongo, type Model } from '../../../common/mongo';
const { Schema, model, models } = connectionMongo;
import { TemplateCollectionSchemaType } from '@fastgpt/global/core/template/type.d';
import { TrainingTypeMap, TemplateCollectionTypeMap } from '@fastgpt/global/core/template/constants';
import { TemplateCollectionName } from '../schema';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';

export const TemplateColCollectionName = 'template.collections';

const TemplateCollectionSchema = new Schema({
  parentId: {
    type: Schema.Types.ObjectId,
    ref: TemplateColCollectionName,
    default: null
  },
  userId: {
    // abandoned
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
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
  type: {
    type: String,
    enum: Object.keys(TemplateCollectionTypeMap),
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createTime: {
    type: Date,
    default: () => new Date()
  },
  updateTime: {
    type: Date,
    default: () => new Date()
  },

  trainingType: {
    type: String,
    enum: Object.keys(TrainingTypeMap),
    required: true
  },
  chunkSize: {
    type: Number,
    required: true
  },
  chunkSplitter: {
    type: String
  },
  qaPrompt: {
    type: String
  },

  fileId: {
    type: Schema.Types.ObjectId,
    ref: 'template.files'
  },
  rawLink: {
    type: String
  },

  rawTextLength: {
    type: Number
  },
  hashRawText: {
    type: String
  },
  metadata: {
    type: Object,
    default: {}
  }
});

try {
  // auth file
  TemplateCollectionSchema.index({ teamId: 1, fileId: 1 }, { background: true });

  // list collection; deep find collections
  TemplateCollectionSchema.index(
    {
      teamId: 1,
      templateId: 1,
      parentId: 1,
      updateTime: -1
    },
    { background: true }
  );
} catch (error) {
  console.log(error);
}

export const MongoTemplateCollection: Model<TemplateCollectionSchemaType> =
  models[TemplateColCollectionName] || model(TemplateColCollectionName, TemplateCollectionSchema);
