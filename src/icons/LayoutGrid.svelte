<script>
  let { 
    size = 24, 
    color = 'currentColor',
    class: className = '',
    ...props 
  } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 512 512"
  fill={color}
  class="icon icon-layout-grid {className}"
  {...props}
>
  <style type="text/css">
	.st0{fill:#000000;}
</style>
<g>
	<path class="st0" d="M421.289,0H90.71C40.609,0,0,40.61,0,90.703V160h512V90.703C512,40.61,471.39,0,421.289,0z"/>
	<path class="st0" d="M0,421.297C0,471.39,40.609,512,90.71,512H296V216H0V421.297z"/>
	<path class="st0" d="M352,512h69.289C471.39,512,512,471.39,512,421.297V216H352V512z"/>
</g>
</svg>
