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
  class="icon icon-users{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M13 20v-2a5 5 0 0 0-10 0v2zm0 0h8v-1c0-2.945-2.239-5-5-5-1.413 0-2.69.626-3.6 1.631M11 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0m7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/>
</svg>
