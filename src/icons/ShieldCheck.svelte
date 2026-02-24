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
  class="icon icon-shield-check{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M20 6h-1c-2.732 0-5.113-1.065-7-3-1.887 1.935-4.268 3-7 3H4v3.166C4 14.86 7.4 19.644 12 21c4.6-1.356 8-6.14 8-11.834z"/>
</svg>
