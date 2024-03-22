import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { TemplateItemType, TemplateListItemType } from '@fastgpt/global/core/template/type.d';
import {
  getAllTemplate,
  getTemplates,
  getTemplateById,
  putTemplateById,
  postWebsiteSync
} from '@/web/core/template/api';
import { defaultTemplateDetail } from '@/constants/template';
import type { TemplateUpdateBody } from '@fastgpt/global/core/template/api.d';
import { TemplateStatusEnum } from '@fastgpt/global/core/template/constants';
import { postCreateTrainingBill } from '@/web/support/wallet/bill/api';
import { checkTeamWebSyncLimit } from '@/web/support/user/team/api';

type State = {
  allTemplates: TemplateListItemType[];
  loadAllTemplates: () => Promise<TemplateListItemType[]>;
  myTemplates: TemplateListItemType[];
  loadTemplates: (parentId?: string) => Promise<any>;
  setTemplates(val: TemplateListItemType[]): void;
  templateDetail: TemplateItemType;
  loadTemplateDetail: (id: string, init?: boolean) => Promise<TemplateItemType>;
  updateTemplate: (data: TemplateUpdateBody) => Promise<any>;
  startWebsiteSync: () => Promise<any>;
};

export const useTemplateStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => ({
        allTemplates: [],
        async loadAllTemplates() {
          const res = await getAllTemplate();
          set((state) => {
            state.allTemplates = res;
          });
          return res;
        },
        myTemplates: [],
        async loadTemplates(parentId = '') {
          const res = await getTemplates({ parentId });
          set((state) => {
            state.myTemplates = res;
          });
          return res;
        },
        setTemplates(val) {
          set((state) => {
            state.myTemplates = val;
          });
        },
        templateDetail: defaultTemplateDetail,
        async loadTemplateDetail(id: string, init = false) {
          if (!id || (id === get().templateDetail._id && !init)) return get().templateDetail;

          const data = await getTemplateById(id);

          set((state) => {
            state.templateDetail = data;
          });

          return data;
        },
        async updateTemplate(data) {
          await putTemplateById(data);

          if (get().templateDetail._id === data.id) {
            set((state) => {
              state.templateDetail = {
                ...get().templateDetail,
                ...data
              };
            });
          }
          set((state) => {
            state.myTemplates = state.myTemplates = state.myTemplates.map((item) =>
              item._id === data.id
                ? {
                    ...item,
                    ...data
                  }
                : item
            );
          });
        },
        async startWebsiteSync() {
          await checkTeamWebSyncLimit();

          const [_, billId] = await Promise.all([
            get().updateTemplate({
              id: get().templateDetail._id,
              status: TemplateStatusEnum.syncing
            }),
            postCreateTrainingBill({
              name: 'core.template.training.Website Sync',
              // @ts-ignore
              templateId: get().templateDetail._id
            })
          ]);
          try {
            postWebsiteSync({ templateId: get().templateDetail._id, billId });
          } catch (error) {}
        }
      })),
      {
        name: 'templateStore',
        partialize: (state) => ({})
      }
    )
  )
);
