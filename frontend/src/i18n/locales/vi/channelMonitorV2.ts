/** Channel Monitor V2 (user + admin passive monitor UI) */
export default {
  channelMonitorV2: {
    title: 'Giám sát kênh',
    updating: 'Đang cập nhật dữ liệu',
    updatedTo: 'Đã cập nhật đến {time}',
    partialCoverage: 'Bao phủ lịch sử một phần',
    bootstrap: {
      title: 'Đang tạo dữ liệu giám sát lịch sử',
      description:
        'Khi bật lần đầu, quá trình tổng hợp thụ động sẽ âm thầm lấp đầy các khung thời gian 90 phút, 24 giờ, 7 ngày và 30 ngày ở chế độ nền. Mọi khoảng thời gian sẽ đầy đủ sau khi hoàn tất.',
      progress: 'Hoàn thành {percent}%',
      working: 'Đang tổng hợp ở chế độ nền…',
    },
    timeRange: 'Khoảng thời gian',
    clearFilters: 'Đặt lại',
    refreshingFilters: 'Bộ lọc đã thay đổi; đang làm mới ma trận, xu hướng và chi tiết…',
    switchingData: 'Đang chuyển đổi dữ liệu đã lọc…',
    summaryAria: 'Tóm tắt khoảng thời gian đã chọn',
    loadFailed: 'Không thể tải giám sát kênh',
    detailLoadFailed: 'Không thể tải chi tiết giám sát kênh',
    otherModels: 'Mô hình khác',
    ignored: 'Đã bỏ qua',
    currentUser: 'Người dùng hiện tại',
    ranges: { '90m': '90 phút', '24h': '24 giờ', '7d': '7 ngày', '30d': '30 ngày' },
    filters: {
      platform: 'Nền tảng', allPlatforms: 'Tất cả', group: 'Nhóm', allGroups: 'Tất cả', model: 'Mô hình', allModels: 'Tất cả',
      empty: 'Không có tùy chọn', selectedCount: '{count}', labelValue: '{label}: {value}'
    },
    groupBy: {
      label: 'Nhóm theo', platform: 'Nền tảng', platformGroup: 'Nền tảng / Nhóm', platformModel: 'Nền tảng / Mô hình', platformGroupModel: 'Nền tảng / Nhóm / Mô hình'
    },
    trendView: { label: 'Chế độ xem xu hướng', pulse: 'Ma trận xung', line: 'Biểu đồ đường' },
    healthMode: { label: 'Hiển thị sức khỏe', overall: 'Tổng thể', success: 'Tỷ lệ lỗi', ttft: 'Token đầu tiên', cache: 'Tỷ lệ bộ nhớ đệm' },
    tabs: { aria: 'Chiều chi tiết', models: 'Mô hình', errors: 'Lý do lỗi', users: 'Xếp hạng người dùng' },
    metrics: {
      rpm: 'RPM',
      tpm: 'TPM',
      tps: 'Token/s',
      rpmDetail: 'Số yêu cầu mỗi phút',
      tpmDetail: 'Số token mỗi phút',
      tpsDetail: 'Quy đổi từ TPM ÷ 60',
      errorRate: 'Tỷ lệ lỗi',
      ttft: 'Token đầu tiên',
      ttftP50: 'Token đầu tiên P50',
      durationP50: 'Thời lượng P50',
      cacheRate: 'Tỷ lệ bộ nhớ đệm',
      cacheDetail: 'Tỷ lệ đọc bộ nhớ đệm',
      successRate: 'Tỷ lệ thành công',
      successRateValue: 'Tỷ lệ thành công {value}',
      errorRateValue: 'Tỷ lệ lỗi {value}',
      rpmValue: 'RPM {value}',
      tpmValue: 'TPM {value}',
      tpsValue: 'Token/s {value}',
      ttftValue: 'Token đầu tiên {value}',
      durationValue: 'Thời lượng {value}',
      cacheRateValue: 'Tỷ lệ bộ nhớ đệm {value}',
    },
    table: { platformModel: 'Nền tảng / Mô hình', rank: 'Hạng', user: 'Người dùng' },
    empty: { title: 'Không có dữ liệu để hiển thị', description: 'Hãy thử thay đổi khoảng thời gian hoặc bộ lọc' },
    bucket: { minutes: 'Khoảng {count} phút', hours: 'Khoảng {count} giờ', days: 'Khoảng {count} ngày' },
    matrix: {
      title: 'Xu hướng tính khả dụng', description: 'Mỗi hàng là một chiều kênh và mỗi khối là một khoảng tổng hợp; di chuột để xem chi tiết', wheelZoom: 'Cuộn trên các khối để phóng to (khoảng hẹp hơn, khối rộng hơn)', wheelZoomX: 'Cuộn trên các khối để phóng to (khoảng hẹp hơn, khối rộng hơn)', dimension: 'Chiều kênh', emptyTitle: 'Không có dữ liệu ma trận cho khoảng thời gian đã chọn', legendAria: 'Chú giải điểm sức khỏe', bad: 'Kém', good: 'Tốt', healthyLegend: 'Khỏe mạnh (≥80)', warningLegend: 'Cần chú ý (50–79)', criticalLegend: 'Nghiêm trọng (<50)', unknownLegend: 'Không có lưu lượng / không đủ mẫu', noTraffic: 'Không có lưu lượng trong khoảng này', noTrafficAt: '{time} · không có lưu lượng', scoreLine: 'Điểm sức khỏe {score}', resetZoom: 'Đặt lại thu phóng'
    },
    chart: {
      title: 'Xu hướng tính khả dụng', description: 'Xu hướng làm mượt: tỷ lệ lỗi · token đầu tiên P50 · tỷ lệ bộ nhớ đệm', emptyTitle: 'Không có dữ liệu xu hướng cho khoảng thời gian đã chọn', errorLegend: 'Tỷ lệ lỗi (trục trái %)', cacheLegend: 'Tỷ lệ bộ nhớ đệm (trục trái %)', ttftLegend: 'Token đầu tiên P50 (trục phải)', errorDataset: 'Xu hướng tỷ lệ lỗi %', cacheDataset: 'Xu hướng tỷ lệ bộ nhớ đệm %', ttftDataset: 'Xu hướng token đầu tiên P50 (ms)', percentAxis: 'Tỷ lệ %', resetZoom: 'Đặt lại thu phóng'
    },
    errorDetail: { http: 'HTTP {code}', upstream: 'Thượng nguồn {code}', noMessage: 'Không có thông báo lỗi', empty: 'Chỉ hiển thị tỷ lệ danh mục (thông báo mẫu chỉ dành cho quản trị viên)' },
    errorCategories: {
      content_policy: 'Chính sách nội dung', authentication: 'Xác thực', context_limit: 'Giới hạn ngữ cảnh', invalid_request: 'Yêu cầu không hợp lệ', model_unsupported: 'Mô hình không được hỗ trợ', group_access: 'Quyền truy cập nhóm', quota_or_balance: 'Hạn mức hoặc số dư', account_pool_unavailable: 'Kho tài khoản không khả dụng', rate_or_capacity: 'Giới hạn tốc độ hoặc dung lượng', timeout: 'Hết thời gian chờ', transport_or_stream: 'Truyền tải hoặc luồng', upstream_forbidden: 'Thượng nguồn từ chối', not_found: 'Không tìm thấy', client_cancelled: 'Máy khách đã hủy', upstream_5xx: 'Thượng nguồn 5xx', internal: 'Nội bộ', other: 'Khác'
    },
    rank: {
      gold: 'Hạng 1 Vàng',
      silver: 'Hạng 2 Bạc',
      bronze: 'Hạng 3 Đồng',
      place: 'Hạng {n}',
      unranked: 'Chưa xếp hạng',
    },
    settings: {
      title: 'Cấu hình giám sát dữ liệu V2',
      description:
        'Cấu hình các chiều tổng hợp mức sử dụng thụ động (nền tảng / mô hình / nhóm) và nhịp làm mới. Màu sức khỏe và chi tiết trên trang /monitor của người dùng hiển thị tỷ lệ, RPM và TPM — không phải khối lượng yêu cầu tuyệt đối.',
      save: 'Lưu',
      loading: 'Đang tải…',
      loadFailed: 'Không thể tải cấu hình V2',
      saveSuccess: 'Đã lưu cấu hình giám sát V2',
      saveFailed: 'Không thể lưu cấu hình V2',
      modeBanner:
        'Chế độ hệ thống hiện tại là {mode}. Quá trình tổng hợp theo phút của V2 sẽ không chạy; cấu hình này có thể được chuẩn bị ngay bây giờ và có hiệu lực sau khi chuyển sang {modeV2}. Thay đổi chế độ trong Cài đặt hệ thống → Khóa chuyển tính năng.',
      modeClosed: 'Giám sát kênh đã tắt',
      modeV1: 'Thăm dò chủ động V1',
      modeV2: 'Giám sát thụ động V2',
      enableTitle: 'Bật tổng hợp V2',
      enableHint:
        'Áp dụng khi chế độ hệ thống là V2. Tắt tùy chọn này chỉ dừng quá trình tổng hợp của cấu hình này; khóa chuyển chế độ hệ thống vẫn nằm trong Khóa chuyển tính năng.',
      refreshTitle: 'Khoảng thời gian tổng hợp',
      refreshHint: 'Ảnh hưởng đến độ chi tiết thời gian của ma trận và nhịp làm mới',
      refreshAria: 'Khoảng thời gian tổng hợp',
      selectPlatform: 'Chọn một nền tảng',
      addPlatform: 'Thêm nền tảng',
      platformsTitle: 'Nền tảng và mô hình',
      platformsHint:
        'Để trống = hiển thị tất cả tên mô hình thực tế; khi điền, chỉ các mô hình được liệt kê mới có hàng riêng và phần còn lại gom vào “Khác”',
      modelsPlaceholder: 'Để trống = tất cả mô hình thực tế; hoặc liệt kê các mô hình phổ biến (còn lại → Khác)',
      badgeAllModels: 'Tất cả mô hình',
      badgeOther: '+ Khác',
      groupsTitle: 'Nhóm được giám sát',
      groupsSelected: 'Đã chọn {count} nhóm',
      groupsAll: 'Tất cả các nhóm',
      groupsEmpty: 'Không có nhóm khả dụng',
      errorsTitle: 'Danh mục lỗi và bỏ qua',
      errorsHint:
        'Các danh mục đã đánh dấu “bỏ qua” sẽ bị loại khỏi tỷ lệ lỗi và điểm sức khỏe, nhưng vẫn xuất hiện mờ trong phân tích lỗi. Lỗi không khớp được gom vào “Khác”.',
      ignoredSummary: 'Đã bỏ qua {ignored} danh mục · tính vào tỷ lệ lỗi {counted} danh mục',
      healthTitle: 'Ngưỡng sức khỏe',
      healthHint:
        'Kiểm soát dải màu hiển thị cho người dùng và điểm tổng thể. Mức mặc định có độ bao dung để tỷ lệ lỗi nhỏ hoặc bộ nhớ đệm thấp không lập tức hiển thị là không khỏe mạnh.',
      fields: {
        minimumSample: 'Mẫu tối thiểu',
        warningError: 'Tỷ lệ lỗi cần chú ý %',
        criticalError: 'Tỷ lệ lỗi nghiêm trọng %',
        targetTtft: 'TTFT mục tiêu ms',
        warningTtft: 'TTFT cần chú ý ms',
        criticalTtft: 'TTFT nghiêm trọng ms',
        warningCache: 'Tỷ lệ bộ nhớ đệm cần chú ý %',
        criticalCache: 'Tỷ lệ bộ nhớ đệm nghiêm trọng %',
      },
      namedModelsEmpty: 'Danh sách mô hình của nền tảng đang trống: mọi tên mô hình thực tế sẽ được hiển thị (không bị gom vào “Khác”).',
      namedModelsCount: 'Hiển thị {count} chiều mô hình đã đặt tên; các mô hình không nằm trong danh sách sẽ gom vào “Khác” theo từng nền tảng.',
      userContractTitle: 'Quy ước hiển thị phía người dùng',
      userContract: {
        health: 'Trọng số màu sức khỏe: tỷ lệ lỗi 60% + token đầu tiên P50 20% + tỷ lệ bộ nhớ đệm 20% (ngưỡng có thể cấu hình ở trên)',
        trend: 'Xu hướng có thể chuyển đổi giữa ma trận xung và biểu đồ đường (lỗi · bộ nhớ đệm · token đầu tiên)',
        latency: 'Độ trễ hiển thị AVG · P50 · P90; số lượng yêu cầu / lỗi tuyệt đối không được hiển thị',
        models: 'Danh sách mô hình để trống hiển thị tên thực tế và không bao giờ gom toàn bộ vào “Khác”',
      },
    },
    admin: {
      descriptionV1:
        'Chế độ hệ thống là thăm dò chủ động V1: quản lý giám sát thăm dò và chạy kiểm tra ngay; quá trình tổng hợp V2 không chạy.',
      descriptionV2:
        'Chế độ hệ thống là giám sát thụ động V2: cấu hình các chiều tổng hợp; thăm dò chủ động V1 không chạy.',
      tabAria: 'Quản lý giám sát',
      tabV2: 'Cấu hình giám sát dữ liệu V2',
      tabV1Active: 'Thăm dò chủ động V1',
      tabV1History: 'Lịch sử V1 (thăm dò không hoạt động trong chế độ hiện tại)',
    },
  },
}
