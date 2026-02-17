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
  viewBox="0.4 0.4 31.2 31.2"
  width={size}
  height={size}
  fill={color}
  class="icon icon-bar-chart-3{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M29 10a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1zM9 16a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1zM19 4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v24a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1z"/>
</svg>
