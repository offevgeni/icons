<script>
  let {
    size = 24,
    color = 'currentColor',
    strokeWidth = 1.5,
    title = '',
    class: className = '',
    ...rest
  } = $props();
</script>

<svg
  viewBox="1.2 1.2 21.6 21.6"
  width={size}
  height={size}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-bar-chart-3{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="m21 3-7 6-4-4-7 6m1.5 10A1.5 1.5 0 0 1 3 19.5v-2a1.5 1.5 0 0 1 3 0v2A1.5 1.5 0 0 1 4.5 21m7 0a1.5 1.5 0 0 1-1.5-1.5v-5a1.5 1.5 0 0 1 3 0v5a1.5 1.5 0 0 1-1.5 1.5m7 0a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 3 0v3a1.5 1.5 0 0 1-1.5 1.5"/>
</svg>
