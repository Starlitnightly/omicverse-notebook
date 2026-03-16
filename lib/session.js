"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSessionContextProvider = setSessionContextProvider;
exports.getSessionContext = getSessionContext;
let provider = null;
function setSessionContextProvider(nextProvider) {
    provider = nextProvider;
}
function getSessionContext() {
    return provider ? provider() : null;
}
