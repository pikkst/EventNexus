var t,e,n,s,o,i;(e=t||(t={})).STRING="string",e.NUMBER="number",e.INTEGER="integer",e.BOOLEAN="boolean",e.ARRAY="array",e.OBJECT="object",(s=n||(n={})).LANGUAGE_UNSPECIFIED="language_unspecified",s.PYTHON="python",(i=o||(o={})).OUTCOME_UNSPECIFIED="outcome_unspecified",i.OUTCOME_OK="outcome_ok",i.OUTCOME_FAILED="outcome_failed",i.OUTCOME_DEADLINE_EXCEEDED="outcome_deadline_exceeded";
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const a=["user","model","function","system"];var r,c,d,l,u,h,f,E,g,C,m,p,O,_,v,y;(c=r||(r={})).HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",c.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",c.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",c.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",c.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT",c.HARM_CATEGORY_CIVIC_INTEGRITY="HARM_CATEGORY_CIVIC_INTEGRITY",(l=d||(d={})).HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",l.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",l.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",l.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",l.BLOCK_NONE="BLOCK_NONE",(h=u||(u={})).HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",h.NEGLIGIBLE="NEGLIGIBLE",h.LOW="LOW",h.MEDIUM="MEDIUM",h.HIGH="HIGH",(E=f||(f={})).BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",E.SAFETY="SAFETY",E.OTHER="OTHER",(C=g||(g={})).FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",C.STOP="STOP",C.MAX_TOKENS="MAX_TOKENS",C.SAFETY="SAFETY",C.RECITATION="RECITATION",C.LANGUAGE="LANGUAGE",C.BLOCKLIST="BLOCKLIST",C.PROHIBITED_CONTENT="PROHIBITED_CONTENT",C.SPII="SPII",C.MALFORMED_FUNCTION_CALL="MALFORMED_FUNCTION_CALL",C.OTHER="OTHER",(p=m||(m={})).TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",p.RETRIEVAL_QUERY="RETRIEVAL_QUERY",p.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",p.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",p.CLASSIFICATION="CLASSIFICATION",p.CLUSTERING="CLUSTERING",(_=O||(O={})).MODE_UNSPECIFIED="MODE_UNSPECIFIED",_.AUTO="AUTO",_.ANY="ANY",_.NONE="NONE",(y=v||(v={})).MODE_UNSPECIFIED="MODE_UNSPECIFIED",y.MODE_DYNAMIC="MODE_DYNAMIC";
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class I extends Error{constructor(t){super(`[GoogleGenerativeAI Error]: ${t}`)}}class T extends I{constructor(t,e){super(t),this.response=e}}class N extends I{constructor(t,e,n,s){super(t),this.status=e,this.statusText=n,this.errorDetails=s}}class R extends I{}class A extends I{}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var S,w;(w=S||(S={})).GENERATE_CONTENT="generateContent",w.STREAM_GENERATE_CONTENT="streamGenerateContent",w.COUNT_TOKENS="countTokens",w.EMBED_CONTENT="embedContent",w.BATCH_EMBED_CONTENTS="batchEmbedContents";class b{constructor(t,e,n,s,o){this.model=t,this.task=e,this.apiKey=n,this.stream=s,this.requestOptions=o}toString(){var t,e;const n=(null===(t=this.requestOptions)||void 0===t?void 0:t.apiVersion)||"v1beta";let s=`${(null===(e=this.requestOptions)||void 0===e?void 0:e.baseUrl)||"https://generativelanguage.googleapis.com"}/${n}/${this.model}:${this.task}`;return this.stream&&(s+="?alt=sse"),s}}async function M(t){var e;const n=new Headers;n.append("Content-Type","application/json"),n.append("x-goog-api-client",function(t){const e=[];return(null==t?void 0:t.apiClient)&&e.push(t.apiClient),e.push("genai-js/0.24.1"),e.join(" ")}(t.requestOptions)),n.append("x-goog-api-key",t.apiKey);let s=null===(e=t.requestOptions)||void 0===e?void 0:e.customHeaders;if(s){if(!(s instanceof Headers))try{s=new Headers(s)}catch(o){throw new R(`unable to convert customHeaders value ${JSON.stringify(s)} to Headers: ${o.message}`)}for(const[t,e]of s.entries()){if("x-goog-api-key"===t)throw new R(`Cannot set reserved header name ${t}`);if("x-goog-api-client"===t)throw new R(`Header name ${t} can only be set using the apiClient field`);n.append(t,e)}}return n}async function D(t,e,n,s,o,i={},a=fetch){const{url:r,fetchOptions:c}=await async function(t,e,n,s,o,i){const a=new b(t,e,n,s,i);return{url:a.toString(),fetchOptions:Object.assign(Object.assign({},L(i)),{method:"POST",headers:await M(a),body:o})}}(t,e,n,s,o,i);return async function(t,e,n=fetch){let s;try{s=await n(t,e)}catch(o){!function(t,e){let n=t;"AbortError"===n.name?(n=new A(`Request aborted when fetching ${e.toString()}: ${t.message}`),n.stack=t.stack):t instanceof N||t instanceof R||(n=new I(`Error fetching from ${e.toString()}: ${t.message}`),n.stack=t.stack);throw n}(o,t)}s.ok||await async function(t,e){let n,s="";try{const e=await t.json();s=e.error.message,e.error.details&&(s+=` ${JSON.stringify(e.error.details)}`,n=e.error.details)}catch(o){}throw new N(`Error fetching from ${e.toString()}: [${t.status} ${t.statusText}] ${s}`,t.status,t.statusText,n)}(s,t);return s}(r,c,a)}function L(t){const e={};if(void 0!==(null==t?void 0:t.signal)||(null==t?void 0:t.timeout)>=0){const n=new AbortController;(null==t?void 0:t.timeout)>=0&&setTimeout(()=>n.abort(),t.timeout),(null==t?void 0:t.signal)&&t.signal.addEventListener("abort",()=>{n.abort()}),e.signal=n.signal}return e}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function x(t){return t.text=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length,F(t.candidates[0]))throw new T(`${G(t)}`,t);return function(t){var e,n,s,o;const i=[];if(null===(n=null===(e=t.candidates)||void 0===e?void 0:e[0].content)||void 0===n?void 0:n.parts)for(const a of null===(o=null===(s=t.candidates)||void 0===s?void 0:s[0].content)||void 0===o?void 0:o.parts)a.text&&i.push(a.text),a.executableCode&&i.push("\n```"+a.executableCode.language+"\n"+a.executableCode.code+"\n```\n"),a.codeExecutionResult&&i.push("\n```\n"+a.codeExecutionResult.output+"\n```\n");return i.length>0?i.join(""):""}(t)}if(t.promptFeedback)throw new T(`Text not available. ${G(t)}`,t);return""},t.functionCall=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length,F(t.candidates[0]))throw new T(`${G(t)}`,t);return H(t)[0]}if(t.promptFeedback)throw new T(`Function call not available. ${G(t)}`,t)},t.functionCalls=()=>{if(t.candidates&&t.candidates.length>0){if(t.candidates.length,F(t.candidates[0]))throw new T(`${G(t)}`,t);return H(t)}if(t.promptFeedback)throw new T(`Function call not available. ${G(t)}`,t)},t}function H(t){var e,n,s,o;const i=[];if(null===(n=null===(e=t.candidates)||void 0===e?void 0:e[0].content)||void 0===n?void 0:n.parts)for(const a of null===(o=null===(s=t.candidates)||void 0===s?void 0:s[0].content)||void 0===o?void 0:o.parts)a.functionCall&&i.push(a.functionCall);return i.length>0?i:void 0}const P=[g.RECITATION,g.SAFETY,g.LANGUAGE];function F(t){return!!t.finishReason&&P.includes(t.finishReason)}function G(t){var e,n,s;let o="";if(t.candidates&&0!==t.candidates.length||!t.promptFeedback){if(null===(s=t.candidates)||void 0===s?void 0:s[0]){const e=t.candidates[0];F(e)&&(o+=`Candidate was blocked due to ${e.finishReason}`,e.finishMessage&&(o+=`: ${e.finishMessage}`))}}else o+="Response was blocked",(null===(e=t.promptFeedback)||void 0===e?void 0:e.blockReason)&&(o+=` due to ${t.promptFeedback.blockReason}`),(null===(n=t.promptFeedback)||void 0===n?void 0:n.blockReasonMessage)&&(o+=`: ${t.promptFeedback.blockReasonMessage}`);return o}function U(t){return this instanceof U?(this.v=t,this):new U(t)}function j(t,e,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var s,o=n.apply(t,e||[]),i=[];return s={},a("next"),a("throw"),a("return"),s[Symbol.asyncIterator]=function(){return this},s;function a(t){o[t]&&(s[t]=function(e){return new Promise(function(n,s){i.push([t,e,n,s])>1||r(t,e)})})}function r(t,e){try{(n=o[t](e)).value instanceof U?Promise.resolve(n.value.v).then(c,d):l(i[0][2],n)}catch(s){l(i[0][3],s)}var n}function c(t){r("next",t)}function d(t){r("throw",t)}function l(t,e){t(e),i.shift(),i.length&&r(i[0][0],i[0][1])}}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const $=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function Y(t){const e=function(t){const e=t.getReader();return new ReadableStream({start(t){let n="";return s();function s(){return e.read().then(({value:e,done:o})=>{if(o)return n.trim()?void t.error(new I("Failed to parse stream")):void t.close();n+=e;let i,a=n.match($);for(;a;){try{i=JSON.parse(a[1])}catch(r){return void t.error(new I(`Error parsing JSON response: "${a[1]}"`))}t.enqueue(i),n=n.substring(a[0].length),a=n.match($)}return s()}).catch(t=>{let e=t;throw e.stack=t.stack,e="AbortError"===e.name?new A("Request aborted when reading from the stream"):new I("Error reading from the stream"),e})}}})}(t.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0}))),[n,s]=e.tee();return{stream:B(n),response:K(s)}}async function K(t){const e=[],n=t.getReader();for(;;){const{done:t,value:s}=await n.read();if(t)return x(k(e));e.push(s)}}function B(t){return j(this,arguments,function*(){const e=t.getReader();for(;;){const{value:t,done:n}=yield U(e.read());if(n)break;yield yield U(x(t))}})}function k(t){const e=t[t.length-1],n={promptFeedback:null==e?void 0:e.promptFeedback};for(const s of t){if(s.candidates){let t=0;for(const e of s.candidates)if(n.candidates||(n.candidates=[]),n.candidates[t]||(n.candidates[t]={index:t}),n.candidates[t].citationMetadata=e.citationMetadata,n.candidates[t].groundingMetadata=e.groundingMetadata,n.candidates[t].finishReason=e.finishReason,n.candidates[t].finishMessage=e.finishMessage,n.candidates[t].safetyRatings=e.safetyRatings,e.content&&e.content.parts){n.candidates[t].content||(n.candidates[t].content={role:e.content.role||"user",parts:[]});const s={};for(const o of e.content.parts)o.text&&(s.text=o.text),o.functionCall&&(s.functionCall=o.functionCall),o.executableCode&&(s.executableCode=o.executableCode),o.codeExecutionResult&&(s.codeExecutionResult=o.codeExecutionResult),0===Object.keys(s).length&&(s.text=""),n.candidates[t].content.parts.push(s)}t++}s.usageMetadata&&(n.usageMetadata=s.usageMetadata)}return n}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function q(t,e,n,s){return Y(await D(e,S.STREAM_GENERATE_CONTENT,t,!0,JSON.stringify(n),s))}async function J(t,e,n,s){const o=await D(e,S.GENERATE_CONTENT,t,!1,JSON.stringify(n),s);return{response:x(await o.json())}}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function V(t){if(null!=t)return"string"==typeof t?{role:"system",parts:[{text:t}]}:t.text?{role:"system",parts:[t]}:t.parts?t.role?t:{role:"system",parts:t.parts}:void 0}function W(t){let e=[];if("string"==typeof t)e=[{text:t}];else for(const n of t)"string"==typeof n?e.push({text:n}):e.push(n);return function(t){const e={role:"user",parts:[]},n={role:"function",parts:[]};let s=!1,o=!1;for(const i of t)"functionResponse"in i?(n.parts.push(i),o=!0):(e.parts.push(i),s=!0);if(s&&o)throw new I("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");if(!s&&!o)throw new I("No content is provided for sending chat message.");if(s)return e;return n}(e)}function X(t){let e;if(t.contents)e=t;else{e={contents:[W(t)]}}return t.systemInstruction&&(e.systemInstruction=V(t.systemInstruction)),e}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Q=["text","inlineData","functionCall","functionResponse","executableCode","codeExecutionResult"],z={user:["text","inlineData"],function:["functionResponse"],model:["text","functionCall","executableCode","codeExecutionResult"],system:["text"]};function Z(t){var e;if(void 0===t.candidates||0===t.candidates.length)return!1;const n=null===(e=t.candidates[0])||void 0===e?void 0:e.content;if(void 0===n)return!1;if(void 0===n.parts||0===n.parts.length)return!1;for(const s of n.parts){if(void 0===s||0===Object.keys(s).length)return!1;if(void 0!==s.text&&""===s.text)return!1}return!0}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tt="SILENT_ERROR";class et{constructor(t,e,n,s={}){this.model=e,this.params=n,this._requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=t,(null==n?void 0:n.history)&&(!function(t){let e=!1;for(const n of t){const{role:t,parts:s}=n;if(!e&&"user"!==t)throw new I(`First content should be with role 'user', got ${t}`);if(!a.includes(t))throw new I(`Each item should include role field. Got ${t} but valid roles are: ${JSON.stringify(a)}`);if(!Array.isArray(s))throw new I("Content should have 'parts' property with an array of Parts");if(0===s.length)throw new I("Each Content should have at least one part");const o={text:0,inlineData:0,functionCall:0,functionResponse:0,fileData:0,executableCode:0,codeExecutionResult:0};for(const e of s)for(const t of Q)t in e&&(o[t]+=1);const i=z[t];for(const e of Q)if(!i.includes(e)&&o[e]>0)throw new I(`Content with role '${t}' can't contain '${e}' part`);e=!0}}(n.history),this._history=n.history)}async getHistory(){return await this._sendPromise,this._history}async sendMessage(t,e={}){var n,s,o,i,a,r;await this._sendPromise;const c=W(t),d={safetySettings:null===(n=this.params)||void 0===n?void 0:n.safetySettings,generationConfig:null===(s=this.params)||void 0===s?void 0:s.generationConfig,tools:null===(o=this.params)||void 0===o?void 0:o.tools,toolConfig:null===(i=this.params)||void 0===i?void 0:i.toolConfig,systemInstruction:null===(a=this.params)||void 0===a?void 0:a.systemInstruction,cachedContent:null===(r=this.params)||void 0===r?void 0:r.cachedContent,contents:[...this._history,c]},l=Object.assign(Object.assign({},this._requestOptions),e);let u;return this._sendPromise=this._sendPromise.then(()=>J(this._apiKey,this.model,d,l)).then(t=>{var e;if(Z(t.response)){this._history.push(c);const n=Object.assign({parts:[],role:"model"},null===(e=t.response.candidates)||void 0===e?void 0:e[0].content);this._history.push(n)}else{G(t.response)}u=t}).catch(t=>{throw this._sendPromise=Promise.resolve(),t}),await this._sendPromise,u}async sendMessageStream(t,e={}){var n,s,o,i,a,r;await this._sendPromise;const c=W(t),d={safetySettings:null===(n=this.params)||void 0===n?void 0:n.safetySettings,generationConfig:null===(s=this.params)||void 0===s?void 0:s.generationConfig,tools:null===(o=this.params)||void 0===o?void 0:o.tools,toolConfig:null===(i=this.params)||void 0===i?void 0:i.toolConfig,systemInstruction:null===(a=this.params)||void 0===a?void 0:a.systemInstruction,cachedContent:null===(r=this.params)||void 0===r?void 0:r.cachedContent,contents:[...this._history,c]},l=Object.assign(Object.assign({},this._requestOptions),e),u=q(this._apiKey,this.model,d,l);return this._sendPromise=this._sendPromise.then(()=>u).catch(t=>{throw new Error(tt)}).then(t=>t.response).then(t=>{if(Z(t)){this._history.push(c);const e=Object.assign({},t.candidates[0].content);e.role||(e.role="model"),this._history.push(e)}else{G(t)}}).catch(t=>{t.message}),u}}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class nt{constructor(t,e,n={}){this.apiKey=t,this._requestOptions=n,e.model.includes("/")?this.model=e.model:this.model=`models/${e.model}`,this.generationConfig=e.generationConfig||{},this.safetySettings=e.safetySettings||[],this.tools=e.tools,this.toolConfig=e.toolConfig,this.systemInstruction=V(e.systemInstruction),this.cachedContent=e.cachedContent}async generateContent(t,e={}){var n;const s=X(t),o=Object.assign(Object.assign({},this._requestOptions),e);return J(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:null===(n=this.cachedContent)||void 0===n?void 0:n.name},s),o)}async generateContentStream(t,e={}){var n;const s=X(t),o=Object.assign(Object.assign({},this._requestOptions),e);return q(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:null===(n=this.cachedContent)||void 0===n?void 0:n.name},s),o)}startChat(t){var e;return new et(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:null===(e=this.cachedContent)||void 0===e?void 0:e.name},t),this._requestOptions)}async countTokens(t,e={}){const n=function(t,e){var n;let s={model:null==e?void 0:e.model,generationConfig:null==e?void 0:e.generationConfig,safetySettings:null==e?void 0:e.safetySettings,tools:null==e?void 0:e.tools,toolConfig:null==e?void 0:e.toolConfig,systemInstruction:null==e?void 0:e.systemInstruction,cachedContent:null===(n=null==e?void 0:e.cachedContent)||void 0===n?void 0:n.name,contents:[]};const o=null!=t.generateContentRequest;if(t.contents){if(o)throw new R("CountTokensRequest must have one of contents or generateContentRequest, not both.");s.contents=t.contents}else if(o)s=Object.assign(Object.assign({},s),t.generateContentRequest);else{const e=W(t);s.contents=[e]}return{generateContentRequest:s}}(t,{model:this.model,generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,cachedContent:this.cachedContent}),s=Object.assign(Object.assign({},this._requestOptions),e);return async function(t,e,n,s){return(await D(e,S.COUNT_TOKENS,t,!1,JSON.stringify(n),s)).json()}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this.apiKey,this.model,n,s)}async embedContent(t,e={}){const n=function(t){if("string"==typeof t||Array.isArray(t))return{content:W(t)};return t}(t),s=Object.assign(Object.assign({},this._requestOptions),e);return async function(t,e,n,s){return(await D(e,S.EMBED_CONTENT,t,!1,JSON.stringify(n),s)).json()}(this.apiKey,this.model,n,s)}async batchEmbedContents(t,e={}){const n=Object.assign(Object.assign({},this._requestOptions),e);return async function(t,e,n,s){const o=n.requests.map(t=>Object.assign(Object.assign({},t),{model:e}));return(await D(e,S.BATCH_EMBED_CONTENTS,t,!1,JSON.stringify({requests:o}),s)).json()}(this.apiKey,this.model,t,n)}}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{constructor(t){this.apiKey=t}getGenerativeModel(t,e){if(!t.model)throw new I("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new nt(this.apiKey,t,e)}getGenerativeModelFromCachedContent(t,e,n){if(!t.name)throw new R("Cached content must contain a `name` field.");if(!t.model)throw new R("Cached content must contain a `model` field.");const s=["model","systemInstruction"];for(const i of s)if((null==e?void 0:e[i])&&t[i]&&(null==e?void 0:e[i])!==t[i]){if("model"===i){if((e.model.startsWith("models/")?e.model.replace("models/",""):e.model)===(t.model.startsWith("models/")?t.model.replace("models/",""):t.model))continue}throw new R(`Different value for "${i}" specified in modelParams (${e[i]}) and cachedContent (${t[i]})`)}const o=Object.assign(Object.assign({},e),{model:t.model,tools:t.tools,toolConfig:t.toolConfig,systemInstruction:t.systemInstruction,cachedContent:t});return new nt(this.apiKey,o,n)}}export{st as G};
