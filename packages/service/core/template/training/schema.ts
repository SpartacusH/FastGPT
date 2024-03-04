/* 模型的知识库 */
import { connectionMongo, type Model } from '../../../common/mongo';
const { Schema, model, models } = connectionMongo;
import { TemplateTrainingSchemaType } from '@fastgpt/global/core/template/type';
import { TemplateDataIndexTypeMap, TrainingTypeMap } from '@fastgpt/global/core/template/constants';
import { TemplateColCollectionName } from '../collection/schema';
import { TemplateCollectionName } from '../schema';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';

export const TemplateTrainingCollectionName = 'template.trainings';

const TrainingDataSchema = new Schema({
  userId: {
    // abandon
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
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: TemplateColCollectionName,
    required: true
  },
  billId: {
    // concat bill
    type: String,
    default: ''
  },
  mode: {
    type: String,
    enum: Object.keys(TrainingTypeMap),
    required: true
  },
  expireAt: {
    // It will be deleted after 7 days
    type: Date,
    default: () => new Date()
  },
  lockTime: {
    type: Date,
    default: () => new Date('2000/1/1')
  },
  model: {
    // ai model
    type: String,
    required: true
  },
  prompt: {
    // qa split prompt
    type: String,
    default: ''
  },
  q: {
    type: String,
    required: true
  },
  a: {
    type: String,
    default: ''
  },
  chunkIndex: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  indexes: {
    type: [
      {
        type: {
          type: String,
          enum: Object.keys(TemplateDataIndexTypeMap),
          required: true
        },
        text: {
          type: String,
          required: true
        }
      }
    ],
    default: []
  }
});

try {
  // lock training data; delete training data
  TrainingDataSchema.index({ teamId: 1, collectionId: 1 });
  // get training data and sort
  TrainingDataSchema.index({ lockTime: 1, mode: 1, weight: -1 });
  TrainingDataSchema.index({ expireAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // 7 days
} catch (error) {
  console.log(error);
}

export const MongoTemplateTraining: Model<TemplateTrainingSchemaType> =
  models[TemplateTrainingCollectionName] || model(TemplateTrainingCollectionName, TrainingDataSchema);

MongoTemplateTraining.syncIndexes();
