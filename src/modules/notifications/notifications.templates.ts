export const buildCaseReadyMessage = (customerName: string, caseCode: string) =>
  `السلام عليكم أستاذ ${customerName}، نود إبلاغك بأن الحالة رقم ${caseCode} أصبحت جاهزة. يرجى التواصل معنا لتنسيق الاستلام.`;

export const buildDiagnosisMessage = (
  customerName: string,
  caseCode: string,
  diagnosis: string,
  estimatedCost: string | number,
) =>
  `السلام عليكم أستاذ ${customerName}، نود أن نعلمك أن تشخيص الحالة رقم ${caseCode} هو: ${diagnosis}. التكلفة التقديرية: ${estimatedCost}.`;

export const buildInvoiceMessage = (
  customerName: string,
  caseCode: string,
  total: string | number,
) =>
  `السلام عليكم أستاذ ${customerName}، هذه فاتورة الحالة رقم ${caseCode}. إجمالي المبلغ المستحق: ${total}.`;
