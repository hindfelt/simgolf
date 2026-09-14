import {originalHoleSettlement} from './original-hole-settlement.js';
import {originalHolePayment} from './original-hole-payment.js';
import {originalHoleCompletionState} from './original-hole-completion-state.js';

// Native hole completion from 0x426b00 through 0x426f3b/event continuation.
export function originalPaidHoleCompletion(snapshot,resolve){
 const settlement=originalHoleSettlement(snapshot,resolve);
 const payment=originalHolePayment(settlement.state,resolve);
 const completed=originalHoleCompletionState(payment.state,resolve);
 return {...completed,calls:[...settlement.calls,...payment.calls,...completed.calls]};
}
