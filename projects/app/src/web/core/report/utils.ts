import { ReportSimpleEditFormType } from '@fastgpt/global/core/report/type';
import { ModuleItemType } from '@fastgpt/global/core/module/type';
import { POST } from '@/web/common/api/request';
import { FlowNodeInputTypeEnum, FlowNodeTypeEnum } from '@fastgpt/global/core/module/node/constant';
import { ModuleInputKeyEnum } from '@fastgpt/global/core/module/constants';
import type { FormatForm2ModulesProps } from '@fastgpt/global/core/report/api.d';
import { useSystemStore } from '@/web/common/system/useSystemStore';

export async function postForm2Modules(data: ReportSimpleEditFormType) {
  const llmModelList = useSystemStore.getState().llmModelList;
  function userGuideTemplate(formData: ReportSimpleEditFormType): ModuleItemType[] {
    return [
      {
        name: 'core.module.template.User guide',
        flowType: FlowNodeTypeEnum.userGuide,
        inputs: [
          {
            key: ModuleInputKeyEnum.welcomeText,
            type: FlowNodeInputTypeEnum.hidden,
            label: 'core.report.Welcome Text',
            value: formData.userGuide.welcomeText
          },
          {
            key: ModuleInputKeyEnum.variables,
            type: FlowNodeInputTypeEnum.hidden,
            label: 'core.report.Chat Variable',
            value: formData.userGuide.variables
          },
          {
            key: ModuleInputKeyEnum.questionGuide,
            type: FlowNodeInputTypeEnum.hidden,
            label: 'core.report.Question Guide',
            value: formData.userGuide.questionGuide
          },
          {
            key: ModuleInputKeyEnum.tts,
            type: FlowNodeInputTypeEnum.hidden,
            label: 'core.report.TTS',
            value: formData.userGuide.tts
          }
        ],
        outputs: [],
        position: {
          x: 447.98520778293346,
          y: 721.4016845336229
        },
        moduleId: 'userGuide'
      }
    ];
  }
  const maxToken =
    llmModelList.find((item) => item.model === data.aiSettings.model)?.maxResponse || 4000;

  const props: FormatForm2ModulesProps = {
    formData: data,
    chatModelMaxToken: maxToken,
    llmModelList
  };

  const modules = await POST<ModuleItemType[]>(`/core/report/form2Modules/fastgpt-universal`, props);

  return [...userGuideTemplate(data), ...modules];
}
