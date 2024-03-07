import { connectionMongo, type Model } from '../../common/mongo';
const { Schema, model, models } = connectionMongo;
import { TemplateSchemaType } from '@fastgpt/global/core/template/type.d';
import {
  TemplateStatusEnum,
  TemplateStatusMap,
  TemplateTypeMap
} from '@fastgpt/global/core/template/constants';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { PermissionTypeEnum, PermissionTypeMap } from '@fastgpt/global/support/permission/constant';

export const TemplateCollectionName = 'templates';

const TemplateSchema = new Schema({
  parentId: {
    type: Schema.Types.ObjectId,
    ref: TemplateCollectionName,
    default: null
  },
  userId: {
    //abandon
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
  type: {
    type: String,
    enum: Object.keys(TemplateTypeMap),
    required: true,
    default: 'template'
  },
  status: {
    type: String,
    enum: Object.keys(TemplateStatusMap),
    default: TemplateStatusEnum.active
  },
  avatar: {
    type: String,
    default: '/icon/logo.svg'
  },
  name: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileId: {
    type: String,
    required: true
  },
  updateTime: {
    type: Date,
    default: () => new Date()
  },
  createTime: {
    type: Date,
    default: () => new Date()
  },
  vectorModel: {
    type: String,
    required: true,
    default: 'text-embedding-ada-002'
  },
  agentModel: {
    type: String,
    required: true,
    default: 'gpt-3.5-turbo-16k'
  },
  intro: {
    type: String,
    default: ''
  },
  permission: {
    type: String,
    enum: Object.keys(PermissionTypeMap),
    default: PermissionTypeEnum.private
  },
  websiteConfig: {
    type: {
      url: {
        type: String,
        required: true
      },
      selector: {
        type: String,
        default: 'body'
      }
    }
  }
});

try {
  TemplateSchema.index({ teamId: 1 });
} catch (error) {
  console.log(error);
}

export const MongoTemplate: Model<TemplateSchemaType> =
  models[TemplateCollectionName] || model(TemplateCollectionName, TemplateSchema);
MongoTemplate.syncIndexes();
