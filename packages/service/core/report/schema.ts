import { ReportTypeMap } from '@fastgpt/global/core/report/constants';
import { connectionMongo, type Model } from '../../common/mongo';
const { Schema, model, models } = connectionMongo;
import type { ReportSchema as ReportType } from '@fastgpt/global/core/report/type.d';
import { PermissionTypeEnum, PermissionTypeMap } from '@fastgpt/global/support/permission/constant';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';


export const reportCollectionName = 'reports';

const ReportSchema = new Schema({
  userId: {
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
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'simple',
    enum: Object.keys(ReportTypeMap)
  },
  simpleTemplateId: {
    type: String,
    default: 'report-universal',
    required: true
  },
  avatar: {
    type: String,
    default: '/icon/logo.svg'
  },
  intro: {
    type: String,
    default: ''
  },
  updateTime: {
    type: Date,
    default: () => new Date()
  },
  modules: {
    type: Array,
    default: []
  },
  inited: {
    type: Boolean
  },
  permission: {
    type: String,
    enum: Object.keys(PermissionTypeMap),
    default: PermissionTypeEnum.private
  }
});

try {
  ReportSchema.index({ updateTime: -1 });
  ReportSchema.index({ teamId: 1 });
} catch (error) {
  console.log(error);
}

export const MongoReport: Model<ReportType> =
  models[reportCollectionName] || model(reportCollectionName, ReportSchema);

MongoReport.syncIndexes();
