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
  viewBox="-51.2 -51.2 614.4 614.4"
  width={size}
  height={size}
  fill={color}
  class="icon icon-layout-grid{className ? ' ' + className : ''}"
  aria-hidden={!title}
  role={title ? "img" : "presentation"}
  {...rest}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M421.289 0H90.71C40.609 0 0 40.61 0 90.703V160h512V90.703C512 40.61 471.39 0 421.289 0"/><path d="M0 421.297C0 471.39 40.609 512 90.71 512H296V216H0z"/><path d="M352 512h69.289C471.39 512 512 471.39 512 421.297V216H352z"/>
</svg>
