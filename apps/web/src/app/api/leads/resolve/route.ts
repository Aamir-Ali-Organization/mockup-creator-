import { isGhlReady, resolveLeadByFleadid } from '@/lib/ghl';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fleadid =
      searchParams.get('fleadid') ||
      searchParams.get('fLeadId') ||
      searchParams.get('leadId') ||
      searchParams.get('facebookLeadId');

    if (!fleadid) {
      return Response.json({
        success: true,
        ghlReady: isGhlReady(),
        lead: {
          mode: 'new',
          fleadid: null,
          contactId: null,
          prefill: {},
          mockupAlreadyGenerated: false,
        },
      });
    }

    const lead = await resolveLeadByFleadid(fleadid);
    return Response.json({
      success: true,
      ghlReady: isGhlReady(),
      lead: {
        mode: lead.mode,
        fleadid: lead.fleadid,
        contactId: lead.contactId,
        prefill: lead.prefill,
        mockupAlreadyGenerated: lead.mockupAlreadyGenerated,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
