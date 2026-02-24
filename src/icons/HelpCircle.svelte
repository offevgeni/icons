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
  class="icon icon-help-circle{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M11.967 12.75c1-1 2-1.395 2-2.5a2 2 0 0 0-3.937-.5m1.937 6h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
</svg>
