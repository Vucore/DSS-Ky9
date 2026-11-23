"""Giới thiệu ngắn về luồng xử lý PERSTOUR."""
import streamlit as st


def render_overview(on_start):
    st.title("Từ ảnh Flickr đến hành trình")
    st.write("PERSTOUR dùng thời gian chụp ảnh để ước lượng sở thích của du khách và chọn tuyến có điểm cao nhất trong số phút cho phép.")
    st.markdown(
        "1. **Gộp ảnh thành lượt ghé.** Ảnh đầu lúc 09:00 và ảnh cuối lúc 09:30 cho một lượt 30 phút.\n"
        "2. **Tính mốc cho từng điểm đến.** Đếm số lượt ghé và tính thời lượng trung bình từ các chuyến còn lại.\n"
        "3. **Suy ra sở thích theo loại.** Nếu bạn ở 30 phút tại nơi trung bình là 15 phút, lượt đó đóng góp 2 vào sở thích.\n"
        "4. **Chọn tuyến.** Ước lượng thời gian và điểm số, tìm tuyến vừa ngân sách rồi đối chiếu với chuyến thật."
    )
    st.button("Nhập dữ liệu →", type="primary", on_click=on_start, args=(0,))
