import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes, responseWriteController } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { addLog } from '@fastgpt/service/common/system/log';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { MongoTemplateData } from '@fastgpt/service/core/template/data/schema';
import { findTemplateAndAllChildren } from '@fastgpt/service/core/template/controller';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import {
  checkExportTemplateLimit,
  updateExportTemplateLimit
} from '@fastgpt/service/support/user/utils';

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    let { templateId } = req.query as {
      templateId: string;
    };

    if (!templateId || !global.pgClient) {
      throw new Error('缺少参数');
    }

    // 凭证校验
    const { teamId } = await authTemplate({ req, authToken: true, templateId, per: 'w' });

    await checkExportTemplateLimit({
      teamId,
      limitMinutes: global.feConfigs?.limit?.exportTemplateLimitMinutes
    });

    const templates = await findTemplateAndAllChildren({
      teamId,
      templateId,
      fields: '_id'
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8;');
    res.setHeader('Content-Disposition', 'attachment; filename=template.csv; ');

    const cursor = MongoTemplateData.find<{
      _id: string;
      collectionId: { name: string };
      q: string;
      a: string;
    }>(
      {
        teamId,
        templateId: { $in: templates.map((d) => d._id) }
      },
      'q a'
    )
      .limit(50000)
      .cursor();

    const write = responseWriteController({
      res,
      readStream: cursor
    });

    write(`\uFEFFindex,content`);

    cursor.on('data', (doc) => {
      const q = doc.q.replace(/"/g, '""') || '';
      const a = doc.a.replace(/"/g, '""') || '';

      write(`\n"${q}","${a}"`);
    });

    cursor.on('end', () => {
      cursor.close();
      res.end();
      updateExportTemplateLimit(teamId);
    });

    cursor.on('error', (err) => {
      addLog.error(`export template error`, err);
      res.status(500);
      res.end();
    });
  } catch (err) {
    res.status(500);
    addLog.error(`export template error`, err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});

export const config = {
  api: {
    responseLimit: '100mb'
  }
};
