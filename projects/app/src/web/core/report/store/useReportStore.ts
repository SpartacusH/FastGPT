import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getMyReports, getModelById, putReportById } from '@/web/core/report/api';
import { defaultReport } from '@/constants/report';
import type { ReportUpdateParams } from '@fastgpt/global/core/report/api.d';
import { ReportDetailType, ReportListItemType } from '@fastgpt/global/core/report/type.d';

type State = {
  myReports: ReportListItemType[];
  loadMyReports: (init?: boolean) => Promise<ReportListItemType[]>;
  reportDetail: ReportDetailType;
  loadReportDetail: (id: string, init?: boolean) => Promise<ReportDetailType>;
  updateReportDetail(reportId: string, data: ReportUpdateParams): Promise<void>;
  clearReportModules(): void;
};

export const useReportStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => ({
        myReports: [],
        async loadMyReports(init = true) {
          if (get().myReports.length > 0 && !init) return [];
          const res = await getMyReports();
          set((state) => {
            state.myReports = res;
          });
          return res;
        },
        reportDetail: defaultReport,
        async loadReportDetail(id: string, init = false) {
          if (id === get().reportDetail._id && !init) return get().reportDetail;

          const res = await getModelById(id);
          set((state) => {
            state.reportDetail = res;
          });
          return res;
        },
        async updateReportDetail(reportId: string, data: ReportUpdateParams) {
          await putReportById(reportId, data);
          set((state) => {
            state.reportDetail = {
              ...state.reportDetail,
              ...data
            };
          });
        },
        clearReportModules() {
          set((state) => {
            state.reportDetail = {
              ...state.reportDetail,
              modules: []
            };
          });
        }
      })),
      {
        name: 'reportStore',
        partialize: (state) => ({})
      }
    )
  )
);
