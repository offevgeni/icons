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
  class="icon icon-heart{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M15.7 4C18.87 4 21 6.98 21 9.76 21 15.39 12.16 20 12 20S3 15.39 3 9.76C3 6.98 5.13 4 8.3 4c1.82 0 3.01.91 3.7 1.71.69-.8 1.88-1.71 3.7-1.71"/>
</svg>
