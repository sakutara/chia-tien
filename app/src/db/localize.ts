import { T, t } from '../i18n'
import { localizeSessionName } from '../domain/sessionRules'
import type { Member, SessionKeo } from '../types'

/** Tên mặc định của hồ sơ chủ app, lưu trong DB bằng tiếng Việt (nguồn của khoá dịch). */
export const DEFAULT_HOST_NAME = T('Tôi')

/** BR-9.9: hồ sơ "Tôi" chưa đổi tên hiển thị theo ngôn ngữ hiện tại; tên người dùng tự đặt giữ nguyên. */
export function localizeMember<M extends Pick<Member, 'name' | 'isDefaultHost'>>(member: M): M {
  return member.isDefaultHost && member.name === DEFAULT_HOST_NAME ? { ...member, name: t(DEFAULT_HOST_NAME) } : member
}

/** BR-9.9: tên kèo mặc định (`Kèo n` / `Venue n`) hiển thị theo ngôn ngữ hiện tại. */
export function localizeSession<S extends Pick<SessionKeo, 'name'>>(session: S): S {
  const name = localizeSessionName(session.name)
  return name === session.name ? session : { ...session, name }
}
