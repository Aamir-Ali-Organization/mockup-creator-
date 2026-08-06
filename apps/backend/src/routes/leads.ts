import type { FastifyPluginAsync } from 'fastify';
import { resolveLeadByFleadid, isGhlReady } from '../services/ghl.service.js';

export const leadRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/leads/resolve', async (request) => {
    const query = request.query as { fleadid?: string; fLeadId?: string; leadId?: string };
    const fleadid = query.fleadid || query.fLeadId || query.leadId || null;

    if (!fleadid) {
      return {
        success: true,
        ghlReady: isGhlReady(),
        lead: {
          mode: 'new',
          fleadid: null,
          contactId: null,
          prefill: {},
          mockupAlreadyGenerated: false,
        },
      };
    }

    const lead = await resolveLeadByFleadid(fleadid);
    return {
      success: true,
      ghlReady: isGhlReady(),
      lead: {
        mode: lead.mode,
        fleadid: lead.fleadid,
        contactId: lead.contactId,
        prefill: lead.prefill,
        mockupAlreadyGenerated: lead.mockupAlreadyGenerated,
      },
    };
  });
};
