# Architecture

## Scopo
Descrivere la struttura ad alto livello del sistema finale e i principali flussi tra i suoi componenti.

## Contenuti Da Formalizzare
- componenti principali e loro responsabilita'
- confini tra simulator, backend, storage e frontend
- flusso dei dati end-to-end
- modelli di integrazione tra servizi
- dipendenze infrastrutturali ed esterne

## Note Iniziali
- Il sistema candidato di partenza comprende `device-simulator`, API, database e dashboard web.
- Il database dovra' essere la source of truth dello stato operativo.
- La progettazione dovra' chiarire quali responsabilita' restano locali ai componenti e quali contratti devono essere condivisi.
