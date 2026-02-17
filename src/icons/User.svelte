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
  viewBox="-4.55 -4.55 54.64 54.64"
  width={size}
  height={size}
  fill={color}
  class="icon icon-user{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M22.766.001C10.194.001 0 10.193 0 22.766s10.193 22.765 22.766 22.765c12.574 0 22.766-10.192 22.766-22.765S35.34.001 22.766.001m0 6.807a7.53 7.53 0 1 1 .001 15.06 7.53 7.53 0 0 1-.001-15.06m-.005 32.771a16.7 16.7 0 0 1-10.88-4.012 3.2 3.2 0 0 1-1.126-2.439c0-4.217 3.413-7.592 7.631-7.592h8.762c4.219 0 7.619 3.375 7.619 7.592a3.2 3.2 0 0 1-1.125 2.438 16.7 16.7 0 0 1-10.881 4.013"/>
</svg>
