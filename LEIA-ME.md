# Cachorro Rebelde Aventura

Aventura em labirintos com 15 cenários. Encontre os ossos para abrir a saída, cave a terra e enfrente os predadores. Use as setas na tela ou no teclado para movimentar o cachorro; use **CAVAR**, a tecla **E** ou espaço para cavar. Os predadores se movimentam somente quando o cachorro consegue andar.

O progresso é salvo automaticamente no armazenamento do navegador deste dispositivo, incluindo fase, ossos, mapas modificados, pontuação, vidas e predadores. Ao recarregar, escolha **CONTINUAR**. Limpar os dados do navegador, usar outro navegador ou dispositivo, ou bloquear o armazenamento local pode impedir a recuperação; não há sincronização em nuvem.

## Abrir localmente

Na pasta deste projeto, execute `python3 -m http.server 4173` e acesse `http://localhost:4173/`. A página principal `index.html` abre o jogo do labirinto. `adventure.html` também abre a mesma aventura. O site é estático e não precisa de servidor de jogo, banco de dados ou token de bot.

## Testes

Execute `npm test` para verificar a lógica da campanha, movimentos, itens, portais e salvamento.

O arquivo `manifest.json` e o ícone 512 × 512 preparam a identificação do app, mas a criação do aplicativo Android e a publicação na Play Store são etapas separadas.
