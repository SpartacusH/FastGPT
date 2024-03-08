import { GET, POST, DELETE, PUT } from '@/web/common/api/request';
import type { ReportDetailType, ReportListItemType } from '@fastgpt/global/core/report/type.d';
import { RequestPaging } from '@/types/index';
import { addDays } from 'date-fns';
import type { GetReportChatLogsParams } from '@/global/core/api/reportReq.d';
import type { CreateReportParams, ReportUpdateParams } from '@fastgpt/global/core/report/api.d';

/**
 * 获取报告列表
 */
export const getReport = () => GET<ReportListItemType[]>('/core/report/list');

/**
 * 创建一个报告
 */
export const postCreateReport = (data: CreateReportParams) => POST<string>('/core/report/create', data);

/**
 * 根据 ID 删除报告
 */
export const delModelById = (id: string) => DELETE(`/core/report/del?reportId=${id}`);

/**
 * 根据 ID 获取报告
 */
export const getReportModelById = (id: string) => GET<ReportDetailType>(`/core/report/detail?reportId=${id}`);

/**
 * 根据 ID 更新报告
 */
export const putReportById = (id: string, data: ReportUpdateParams) =>
  PUT(`/core/report/update?reportId=${id}`, data);

/* 共享市场 */
/**
 * 获取共享市场报告
 */
export const getShareModelList = (data: { searchText?: string } & RequestPaging) =>
  POST(`/core/report/share/getModels`, data);

/**
 * 收藏/取消收藏报告
 */
export const triggerModelCollection = (reportId: string) =>
  POST<number>(`/core/report/share/collection?reportId=${reportId}`);

// ====================== data
export const getReportTotalUsage = (data: { reportId: string }) =>
  POST<{ date: String; total: number }[]>(`/core/report/data/totalUsage`, {
    ...data,
    start: addDays(new Date(), -13),
    end: addDays(new Date(), 1)
  }).then((res) => (res.length === 0 ? [{ date: new Date(), total: 0 }] : res));

// =================== chat logs
export const getReportChatLogs = (data: GetReportChatLogsParams) => POST(`/core/report/getChatLogs`, data);
