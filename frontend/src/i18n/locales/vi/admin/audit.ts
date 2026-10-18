export default {
  audit: {
    title: 'Nhật ký kiểm toán',
    description: 'Ghi lại các thao tác trên mặt phẳng quản lý của quản trị viên và người dùng. Thông tin xác thực trong tiêu đề chỉ giữ lại các ký tự đầu/cuối và phần thân yêu cầu đã được ẩn bớt. Không thể xóa từng mục riêng lẻ; thao tác xóa tất cả yêu cầu xác minh hai yếu tố.',
    clearAll: 'Xóa tất cả',
    empty: 'Chưa có nhật ký kiểm toán nào',
    loadFailed: 'Không thể tải nhật ký kiểm toán',
    filters: {
      all: 'Tất cả',
      q: 'Từ khóa',
      qPlaceholder: 'Đường dẫn / hành động / email người thực hiện',
      actorEmail: 'Email người thực hiện',
      action: 'Hành động',
      clientIp: 'IP máy khách',
      method: 'Phương thức',
      authMethod: 'Phương thức xác thực',
      result: 'Kết quả',
      resultSuccess: 'Thành công',
      resultFailure: 'Thất bại',
      startTime: 'Thời gian bắt đầu',
      endTime: 'Thời gian kết thúc'
    },
    columns: {
      time: 'Thời gian',
      actor: 'Người thực hiện',
      action: 'Hành động',
      method: 'Phương thức',
      result: 'Kết quả',
      clientIp: 'IP máy khách',
      detail: 'Chi tiết'
    },
    detail: {
      title: 'Chi tiết nhật ký kiểm toán',
      actorRole: 'Vai trò',
      methodPath: 'Phương thức / Đường dẫn',
      latency: 'Độ trễ',
      requestId: 'ID yêu cầu',
      credential: 'Thông tin xác thực (đã che)',
      userAgent: 'User-Agent',
      requestBody: 'Phần thân yêu cầu (đã ẩn bớt)',
      extra: 'Thông tin bổ sung'
    },
    clearConfirm: {
      title: 'Xóa toàn bộ nhật ký kiểm toán',
      message: 'Thao tác này sẽ xóa vĩnh viễn tất cả nhật ký kiểm toán và không thể hoàn tác. Bản thân hành động xóa cũng sẽ được ghi lại. Tiếp tục?',
      totpTitle: 'Nhập mã xác thực hai yếu tố',
      totpHint: 'Việc xóa nhật ký kiểm toán yêu cầu xác minh TOTP mới.',
      success: 'Đã xóa {count} nhật ký kiểm toán',
      failed: 'Không thể xóa nhật ký kiểm toán'
    }
  }
}
