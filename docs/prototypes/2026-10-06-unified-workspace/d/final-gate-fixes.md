# D · targeted independent browser gate corrections

Только текущие app.js/report.md/decision.md при необходимости index.html/styles.css. Никакого Git/API/browser/server/приложения/других вариантов. НЕ переписать принятую единую архитектуру.

1. Browser checked validRejected withreportdate+DC02. Evidence becomesRejected, blocker1/RFT1 correct, но Projectcounters остаются63recorded19issued, несмотря подсказку «Recorded counts results of any outcome». `counts()` currentlyusesaccepted `a` forALLaggregates. Исправить: resultRecorded = statusaccepted ORstatusrejected ->recorded63+1,issued19-1; RFT remains1unlessAccepted ->2. Accepted afterrecordedRejected remainsrecorded64/issued18, not65/17. Accepted idempotent. RepeatedRejected samecounts64/18. Thisisobligationswithresult, notacceptedpercentage. Update report removeRejectedcounterlimitationanddescribeverifiedscopehonestly (main browser testing stillunderway).
2. User explicitly against static instructionblocks compensating UI. Remove HOWTO/meta subtitleparagraphs fromscreens: Fabrication "Select a spool; it stays selected...", RFT "Each criterion is shown on its own row...", NDE "Shared inspection service. The obligation...". UIalreadyhasselectedobjectchip,labels,breadcrumbs,contextualHelp. Можно убрать эти строки целиком или заменить только краткой предметнойscopeinfo, НО не очередной инструкцией. Required trace/NDE constraints, blockerreasons, Readerexplanationandempty-stateinfo mustremainvisible. Overviewdoesnotneedhowto.
3. Material3inputs allcalled Heat/trace inARIA. Makeaccessible namesunique: Heat/trace forIC-2104,IC-3310,IC-5527 whilevisible labelcanremainshort. Associatedlabels stable; DON'Trerenderinputs onHelp.

That'sall. Real targeted edits andshortstatus. Do not initiate new designanalysis. Keep58kappand20kCSSarchitecture/visualsame. Onlyfix these 3concreteissues.

