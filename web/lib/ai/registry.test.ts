import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { isProposalOutput, proposalTool } from './registry'

describe('proposalTool', () => {
  it('returns a proposal instead of acting', async () => {
    const tool = proposalTool('create_thing', 'Propone una cosa.', z.object({ name: z.string() }), input => ({
      title: 'Crea cosa',
      summary: [`Nome: ${input.name}`],
    }))
    const output = await tool.execute?.(
      { name: 'Demo' },
      { toolCallId: 't1', messages: [], context: undefined }
    )
    expect(isProposalOutput(output)).toBe(true)
    if (isProposalOutput(output)) {
      expect(output.proposal).toMatchObject({
        kind: 'create_thing',
        title: 'Crea cosa',
        summary: ['Nome: Demo'],
        input: { name: 'Demo' },
      })
    }
  })
  it('recognises only outputs that carry a proposal', () => {
    expect(isProposalOutput({ count: 3 })).toBe(false)
    expect(isProposalOutput(null)).toBe(false)
  })
})
