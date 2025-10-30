## Incorporação do Widget com session_id

Para incorporar o widget em um site externo e garantir que o session_id do visitante seja utilizado no iframe, adicione o script com os parâmetros `id` (widgetId) e `session_id` (ID da sessão do seu site):

```html
<script
  src="https://seu-dominio/widget.js?id=SEU_WIDGET_ID&session_id={{SESSAO_DO_SEU_SITE}}"
  async
></script>
```

- O script irá propagar `session_id` para a URL do iframe (`/w/:widgetId?embedded=true&session_id=...`).
- Dentro do app, o `WidgetEmbed` lê o `session_id` da query e o armazena em `chatStore.externalSessionId` para uso futuro.

Segurança: caso deseje, assine `session_id` com HMAC e valide no backend antes de utilizar.


