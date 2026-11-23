"""Kiểm thử tương tác Streamlit; không cần mở trình duyệt."""
import unittest
from dataclasses import asdict
from pathlib import Path
from streamlit.testing.v1 import AppTest

from perstour.core import POI


class InterfaceTests(unittest.TestCase):
    def app(self):
        app = self.overview()
        self.click(app, "Nhập dữ liệu →")
        return app

    def overview(self):
        return AppTest.from_file(str(Path(__file__).resolve().parents[1] / "app.py"), default_timeout=30).run()

    def click(self, app, label):
        next(b for b in app.button if b.label == label).click().run()
        self.assertEqual(len(app.exception), 0, [e.message for e in app.exception])

    def test_overview_is_first_page_and_keeps_applied_inputs(self):
        app = self.overview()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(app.session_state["stage"], -1)
        self.assertEqual(app.title[0].value, "Thuật toán chọn hành trình")
        self.assertTrue(any("103.8043" in x.value for x in app.latex))
        self.assertTrue(any("8.5663" in x.value for x in app.markdown))
        comparison = app.table[-1].value
        self.assertEqual(comparison["Kết luận"].tolist(), ["Đủ thời gian", "Đủ thời gian", "Vượt B", "Điểm cao nhất"])
        self.click(app, "Bắt đầu tính từng bước →")
        next(x for x in app.number_input if x.label == "Thời gian tối đa B (phút)").set_value(180).run()
        self.click(app, "Tính từng bước →")
        app.radio(key="stage").set_value(-1).run()
        self.assertEqual(app.session_state["config"]["budget"], 180)
        self.click(app, "Nhập dữ liệu →")
        self.assertEqual(next(x.value for x in app.number_input if x.label == "Thời gian tối đa B (phút)"), 180)

    def test_all_seven_steps(self):
        app = self.app()
        self.click(app, "Tính từng bước →")
        for step in range(7):
            with self.subTest(step=step):
                app.session_state["stage"] = step
                app.run()
                self.assertEqual(len(app.exception), 0)
                self.assertEqual(len(app.code), 0)
                self.assertEqual(len(app.tabs), 0)
                if step > 0:
                    self.assertGreater(len(app.latex), 0)
        self.assertTrue(any("8.5663" in x.value for x in app.markdown))
        ledger = next(x.value for x in app.dataframe if "Luỹ kế (phút)" in x.value)
        self.assertAlmostEqual(ledger["Cộng (phút)"].sum(), 224.2590855821)
        self.assertAlmostEqual(ledger["Luỹ kế (phút)"].iloc[-1], 224.2590855821)
        self.assertAlmostEqual(ledger["Điểm cộng"].sum(), 8.5662709465)
        self.assertEqual(ledger["Điểm cộng"].iloc[-1], 0)

    def test_search_controls_and_parameter_reset(self):
        app = self.app()
        self.click(app, "Tính từng bước →")
        app.radio(key="stage").set_value(5).run()
        self.click(app, "Xét tuyến tiếp")
        self.assertEqual(app.session_state["iteration"], 1)
        self.assertTrue(any("Giữ:" in x.value for x in app.success))
        self.click(app, "Xét tất cả")
        self.assertEqual(app.session_state["iteration"], 1957)
        self.click(app, "Lùi 1 tuyến")
        self.assertEqual(app.session_state["iteration"], 1956)
        app.radio(key="stage").set_value(0).run()
        next(x for x in app.number_input if x.label == "Thời gian tối đa B (phút)").set_value(0).run()
        self.click(app, "Tính từng bước →")
        self.assertEqual(app.session_state["iteration"], 0)
        app.radio(key="stage").set_value(6).run()
        self.assertEqual(len(app.exception), 0)
        self.assertTrue(any("Không có tuyến" in x.value for x in app.warning))

    def test_walkthrough_navigation_and_inputs_persist(self):
        app = self.app()
        next(x for x in app.number_input if x.label == "Thời gian tối đa B (phút)").set_value(180).run()
        self.click(app, "Tính từng bước →")
        training = next(x.value for x in app.dataframe if "Chuyến" in x.value)
        self.assertEqual(len(training), 30)
        self.assertNotIn("An/S3", set(training["Chuyến"]))
        for stage in range(1, 6):
            button = next(b for b in app.button if b.label.startswith("Tiếp:") or b.label == "Tính kết quả →")
            self.click(app, button.label)
            self.assertEqual(app.session_state["stage"], stage + 1)
        self.click(app, "Sửa đầu vào")
        self.assertEqual(next(x.value for x in app.number_input if x.label == "Thời gian tối đa B (phút)"), 180)

    def test_worked_math_follows_selected_parameters(self):
        app = self.app()
        self.click(app, "Tính từng bước →")
        app.radio(key="stage").set_value(4).run()
        self.assertTrue(any("103.8043" in x.value for x in app.latex))
        app.radio(key="stage").set_value(0).run()
        next(x for x in app.toggle if x.label == "Cá nhân hoá thời lượng").set_value(False).run()
        next(x for x in app.selectbox if x.label == "Sở thích trong điểm số").set_value("frequency").run()
        next(x for x in app.number_input if x.label == "Mức ưu tiên sở thích η").set_value(1.0).run()
        self.click(app, "Tính từng bước →")
        app.radio(key="stage").set_value(4).run()
        self.assertTrue(any(r"T^{Visit}_u(P2)\approx30.0000" in x.value for x in app.latex))
        self.assertEqual(len(app.exception), 0)
        self.assertTrue(any(r"s(P2)&\approx1" in x.value and r"\approx2.0000" in x.value for x in app.latex))

    def test_web_editor_apply_and_restore(self):
        app = self.app()
        app.session_state["visit-editor-0"] = {"edited_rows": {1: {"duration": 40.0}}, "added_rows": [], "deleted_rows": []}
        self.click(app, "Tính từng bước →")
        self.assertEqual(app.session_state["mock_rows"][1]["duration"], 40)
        app.radio(key="stage").set_value(2).run()
        self.assertTrue(any(r"\frac{40+15+25}{3}" in x.value for x in app.latex))
        app.radio(key="stage").set_value(0).run()
        next(x for x in app.number_input if x.label == "Thời gian tối đa B (phút)").set_value(0).run()
        self.click(app, "Dữ liệu mẫu")
        self.assertEqual(app.session_state["mock_rows"][1]["duration"], 50)
        self.assertEqual(next(x.value for x in app.number_input if x.label == "Thời gian tối đa B (phút)"), 240)

    def test_custom_two_poi_input_and_incomplete_training_recovery(self):
        app = self.app()
        app.session_state["mock_pois"] = [asdict(POI("A", "Vườn", "Thiên nhiên", 10, 106)),
                                          asdict(POI("B", "Nhà cổ", "Văn hoá", 10.01, 106))]
        app.session_state["mock_rows"] = [{"user": "Minh", "poi": "A", "arrival": "2026-05-01T08:00:00", "duration": 10.0},
                                          {"user": "Minh", "poi": "B", "arrival": "2026-05-01T09:00:00", "duration": 15.0}]
        app.run()
        self.assertEqual(len(app.exception), 0)
        self.click(app, "Tính từng bước →")
        self.assertEqual(app.session_state["stage"], 0)
        self.assertTrue(any("Mở bảng dữ liệu" in x.value for x in app.error))
        self.click(app, "Dữ liệu mẫu")
        self.assertEqual(len(app.session_state["mock_pois"]), 8)

    def test_invalid_edit_does_not_replace_applied_inputs(self):
        app = self.app()
        app.session_state["visit-editor-0"] = {"edited_rows": {1: {"duration": 360.0}}, "added_rows": [], "deleted_rows": []}
        self.click(app, "Tính từng bước →")
        self.assertEqual(app.session_state["stage"], 0)
        self.assertEqual(app.session_state["mock_rows"][1]["duration"], 50)
        self.assertTrue(any("chồng" in x.value for x in app.error))


if __name__ == "__main__":
    unittest.main()
