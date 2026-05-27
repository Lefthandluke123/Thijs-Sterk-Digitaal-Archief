
/**
 * @fileOverview Definities voor Firebase-specifieke fouten.
 */

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    const message = `Firestore Toegang Geweigerd: De '${context.operation}' operatie op '${context.path}' is niet toegestaan door de beveiligingsregels.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
