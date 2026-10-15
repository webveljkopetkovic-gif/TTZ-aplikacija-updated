import { describe, expect, it } from 'vitest'
import { detectPlatform, urlBase64ToBytes } from './install'

describe('detectPlatform', () => {
  it('prepoznaje iPhone, Android i računar', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120')).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('other')
  })
  it('iPad koji se predstavlja kao Mac je iOS', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('other')
  })
})

describe('urlBase64ToBytes', () => {
  it('dekodira base64url', () => {
    expect(Array.from(urlBase64ToBytes('AQID'))).toEqual([1, 2, 3])
    expect(Array.from(urlBase64ToBytes('-_8'))).toEqual([251, 255])
  })
})
