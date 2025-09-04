// Attach rrweb to window so the SDK (which checks window.rrweb.record) can detect it
import * as rrweb from 'rrweb';
(window as any).rrweb = rrweb;


