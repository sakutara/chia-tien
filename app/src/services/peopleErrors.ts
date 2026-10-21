export type PeopleErrorCode =
  | 'MEAL_NOT_FOUND'
  | 'MEAL_ARCHIVED'
  | 'INVALID_NAME'
  | 'INVALID_BANK'
  | 'DUPLICATE_NAME'
  | 'MEMBER_NOT_FOUND'
  | 'NOT_PARTICIPANT'
  | 'HOST_REQUIRED'
  | 'MEMBER_IN_USE'
  | 'GROUP_NOT_FOUND'
  | 'GROUP_TOO_SMALL'
  | 'NOT_IN_GROUP'
  | 'MEMBER_ALREADY_GROUPED'
  | 'INVALID_TITLE'
  | 'INVALID_DATE'
  | 'INVALID_NOTE'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_MEMBER_NOT_IN_MEAL'
  | 'SESSION_MEMBER_IN_USE'
  | 'SESSION_EMPTY'
  | 'INVOICE_NOT_FOUND'
  | 'INVOICE_EXISTS'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'PDF_INVALID'
  | 'PDF_ENCRYPTED'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'OCR_FAILED'
  | 'OCR_CANCELLED'
  | 'AI_NO_KEY'
  | 'AI_FAILED'
  | 'PAYER_NOT_IN_SESSION'
  | 'INVALID_ITEM'
  | 'INVALID_SESSION_NAME'
  | 'INVALID_AMOUNT'
  | 'INVALID_DISCOUNT'
  | 'INVALID_SERVICE'
  | 'INVALID_VAT'
  | 'SPLIT_TYPE_LOCKED'
  | 'EQUAL_SPLIT_EMPTY'
  | 'SPLIT_MEMBER_NOT_IN_SESSION'
  | 'CONSUMER_NOT_IN_SESSION'
  | 'INVALID_SHARES'
  | 'ITEM_NOT_FOUND'
  | 'LAST_ITEM_CANNOT_DELETE'
  | 'ENTITY_NOT_FOUND'
  | 'TRANSFER_NOT_FOUND'
  | 'INVALID_SETTLEMENT_MODE'
  | 'ARCHIVE_EMPTY_MEAL'
  | 'ARCHIVE_UNASSIGNED_ITEMS'
  | 'ARCHIVE_UNPAID_ENTITIES'
  | 'INVALID_SNAPSHOT'
  | 'SHARE_FAILED';

export class PeopleError extends Error {
  readonly code: PeopleErrorCode;
  readonly detail?: Record<string, unknown>;

  constructor(code: PeopleErrorCode, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = 'PeopleError';
    this.code = code;
    this.detail = detail;
  }
}
