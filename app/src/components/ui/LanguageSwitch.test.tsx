import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageSwitch from './LanguageSwitch'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { getLang, setLang } from '../../i18n'

afterEach(cleanup)

beforeEach(async () => {
  setLang('vi')
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

describe('LanguageSwitch (BR-9.1, BR-9.7)', () => {
  it('offers the language it will switch to: EN while Vietnamese is active', () => {
    render(<LanguageSwitch />)
    expect(screen.getByRole('button', { name: 'EN' })).toBeTruthy()
  })

  it('switches to English and saves the choice, then offers VI to switch back', async () => {
    render(<LanguageSwitch />)
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))

    expect(getLang()).toBe('en')
    expect(screen.getByRole('button', { name: 'VI' })).toBeTruthy()
    await waitFor(async () => expect((await db.settings.get('default'))?.language).toBe('en'))
  })

  it('switches back to Vietnamese from English', async () => {
    setLang('en')
    render(<LanguageSwitch />)
    await userEvent.click(screen.getByRole('button', { name: 'VI' }))
    expect(getLang()).toBe('vi')
    expect(screen.getByRole('button', { name: 'EN' })).toBeTruthy()
  })
})
