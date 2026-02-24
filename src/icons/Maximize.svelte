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
  viewBox="2.4 2.4 19.2 19.2"
  width={size}
  height={size}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-maximize{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="m14 10 6-6m0 0h-4.5M20 4v4.5M4 4l6 6M4 4v4.5M4 4h4.5M14 14l6 6m0 0v-4.5m0 4.5h-4.5M10 14l-6 6m0 0h4.5M4 20v-4.5"/>
</svg>
