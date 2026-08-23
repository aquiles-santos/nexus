import { describe, it, expect, vi } from 'vitest'
import { createEventBus } from './event-bus.js'

describe('event-bus', () => {
  it('registers and emits events', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on('test', handler)

    bus.emit('test', { value: 1 })
    expect(handler).toHaveBeenCalledWith({ value: 1 })
  })

  it('unsubscribes with off', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on('test', handler)
    bus.off('test', handler)

    bus.emit('test')
    expect(handler).not.toHaveBeenCalled()
  })

  it('clears listeners on destroy', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on('test', handler)
    bus.destroy()

    bus.emit('test')
    expect(handler).not.toHaveBeenCalled()
  })
})
