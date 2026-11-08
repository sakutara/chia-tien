import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LocalAiControl from './LocalAiControl'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('LocalAiControl', () => {
  it('chưa có cache thì báo chưa tải và công tắc đang TẮT', async () => {
    render(<LocalAiControl />)
    expect(await screen.findByText('Chưa tải (~320 MB lần đầu)')).toBeTruthy()
    const toggle = screen.getByRole('switch', { name: 'Xử lý nâng cao bằng AI trên máy' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  it('bật công tắc thì lưu lựa chọn', async () => {
    render(<LocalAiControl />)
    const toggle = await screen.findByRole('switch', { name: 'Xử lý nâng cao bằng AI trên máy' })
    await userEvent.click(toggle)
    expect(localStorage.getItem('fee-calculator.useLocalAi')).toBe('true')
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'))
  })

  it('đã có cache thì hiện nhãn offline và xoá được sau khi xác nhận', async () => {
    const entries = [{ url: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/onnx/model_q4f16.onnx', size: 300 }]
    const cache = {
      keys: async () => entries.map((e) => ({ url: e.url })),
      match: async () => ({ headers: { get: () => '300' } }),
      delete: async () => {
        entries.length = 0
        return true
      },
    }
    vi.stubGlobal('caches', { open: async () => cache })

    render(<LocalAiControl />)
    expect(await screen.findByText(/Đã tải sẵn \(Offline\)/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Xoá dữ liệu AI đã tải' }))
    const dialog = await screen.findByRole('dialog', { name: 'Xoá dữ liệu AI đã tải?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá' }))
    await waitFor(() => expect(screen.getByText('Chưa tải (~320 MB lần đầu)')).toBeTruthy())
    expect(entries).toHaveLength(0)
  })
})
