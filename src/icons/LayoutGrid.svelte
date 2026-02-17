<script>
  let {
    size = 24,
    color = 'currentColor',
    title = '',
    class: className = '',
    ...rest
  } = $props();

  const sizeProps = $derived(typeof size === 'number'
    ? { width: size, height: size }
    : { width: size, height: size });
</script>

<svg
  viewBox="-20.48 -20.48 552.96 552.96"
  {...sizeProps}
  fill={color}
  class="icon icon-layout-grid{className ? ' ' + className : ''}"
  aria-hidden={!title}
  {...rest}
  role={title ? 'img' : 'presentation'}
>
  {#if title}<title>{title}</title>{/if}
  <path d="M421.289 0H90.71C40.609 0 0 40.61 0 90.703V160h512V90.703C512 40.61 471.39 0 421.289 0"/><path d="M0 421.297C0 471.39 40.609 512 90.71 512H296V216H0z"/><path d="M352 512h69.289C471.39 512 512 471.39 512 421.297V216H352z"/>
</svg>
