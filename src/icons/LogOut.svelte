<script>
  let {
    size = 24,
    color = 'currentColor',
    title = '',
    class: className = '',
    ...rest
  } = $props();
</script>

<svg
  viewBox="-1.1 -0.6 25.2 25.2"
  width={size}
  height={size}
  fill={color}
  class="icon icon-log-out{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="m20.49 3.84-6-1.5A2 2 0 0 0 12 4.28V5h-2a2 2 0 0 0-2 2v1a1 1 0 0 0 2 0V7h2v10h-2v-1a1 1 0 0 0-2 0v1a2 2 0 0 0 2 2h2v.72a2 2 0 0 0 .77 1.57 2 2 0 0 0 1.23.43 2 2 0 0 0 .49-.06l6-1.5A2 2 0 0 0 22 18.22V5.78a2 2 0 0 0-1.51-1.94"/><path d="M4.41 13H9a1 1 0 0 0 0-2H4.41l1.3-1.29a1 1 0 0 0-1.42-1.42l-3 3a1.2 1.2 0 0 0-.21.33.94.94 0 0 0 0 .76 1.2 1.2 0 0 0 .21.33l3 3a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42Z"/>
</svg>
