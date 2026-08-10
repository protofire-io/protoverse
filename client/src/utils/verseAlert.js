import Swal from 'sweetalert2'

const verseSwal = Swal.mixin({
  background: 'rgba(12, 6, 28, 0.96)',
  color: '#f4f0ff',
  confirmButtonColor: '#7b3fd4',
  cancelButtonColor: '#2a1a44',
  customClass: {
    popup: 'proto-swal-popup',
    title: 'proto-swal-title',
    htmlContainer: 'proto-swal-text',
    confirmButton: 'proto-swal-confirm',
  },
  buttonsStyling: true,
})

export const showVerseAlert = (title, text, icon = 'info') =>
  verseSwal.fire({
    title,
    text,
    icon,
    iconColor:
      icon === 'error'
        ? '#ff6ec7'
        : icon === 'success'
          ? '#80eaff'
          : '#c4b5ff',
  })

export default verseSwal
