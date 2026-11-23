"""Kiểm thử tương tác Streamlit; không cần mở trình duyệt."""
import unittest
from math import sqrt
from pathlib import Path
from streamlit.testing.v1 import AppTest


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

    def test_glasgow_holdout_is_excluded_and_compared_with_the_recommended_route(self):
        app = self.app()
        selector = app.selectbox(key="glasgow-sequence")
        self.assertEqual(len(selector.options), 17)
        self.assertNotIn("input-source", [widget.key for widget in app.radio])
        self.click(app, "Tính từng bước →")
        self.assertEqual(app.session_state["config"]["held_out"], "733")
        photos = next(x.value for x in app.dataframe if "Mã ảnh" in x.value)
        training, test = [x.value for x in app.dataframe if "Chuyến" in x.value]
        example = training[(training["Chuyến"] == "737") & (training["Điểm"] == "2")].iloc[0]
        self.assertEqual(len(photos), example["Số ảnh"])
        self.assertTrue(example["Ảnh đầu"].endswith(photos["Giờ chụp"].iloc[0]))
        self.assertTrue(example["Ảnh cuối"].endswith(photos["Giờ chụp"].iloc[-1]))
        self.assertTrue(any("31.9500" in x.value for x in app.latex))
        self.assertEqual(len(training), 2830)
        self.assertNotIn("733", set(training["Chuyến"]))
        self.assertEqual(set(test["Chuyến"]), {"733"})
        self.assertEqual(test["Điểm"].tolist(), ["21", "2", "16"])
        for stage in range(2, 7):
            with self.subTest(stage=stage):
                self.click(app, "Xem kết quả →" if stage == 6 else "Tiếp →")
                self.assertEqual(app.session_state["stage"], stage)
        ledger = next(x.value for x in app.dataframe if "Luỹ kế (phút)" in x.value)
        self.assertAlmostEqual(ledger["Luỹ kế (phút)"].iloc[-1], 108.11, places=2)
        shown = [text.value for text in app.markdown]
        self.assertIn("**Precision 75% · Recall 100% · F1 86%**", shown)
        matched = next(x.value for x in app.dataframe if "Điểm trùng" in x.value)
        self.assertEqual(matched["Điểm trùng"].tolist(),
                         ["Gallery of Modern Art", "Glasgow Queen Street railway station", "Buchanan Street"])
        differences = matched["Dự đoán (phút)"] - matched["Thực tế (phút)"]
        rmse = sqrt((differences ** 2).mean())
        self.assertAlmostEqual(rmse, 53.58, places=2)
        self.assertIn(f"RMSE {rmse:.2f} phút · Tổng độ phổ biến 941 · Tổng sở thích 7.39", shown)

        self.click(app, "Sửa đầu vào")
        app.selectbox(key="glasgow-sequence").set_value("1676").run()
        app.number_input(key="glasgow-budget").set_value(0).run()
        self.click(app, "Tính từng bước →")
        self.assertEqual(app.session_state["config"]["held_out"], "1676")
        app.radio(key="stage").set_value(6).run()
        self.assertFalse(app.exception)
        self.assertTrue(any("Không có tuyến" in warning.value for warning in app.warning))
        self.assertFalse(any("Precision 75%" in text.value for text in app.markdown))

    def test_batch_glasgow_uses_applied_budget_and_counts_missing_routes(self):
        app = self.app()
        self.click(app, "Tính từng bước →")
        app.radio(key="stage").set_value(6).run()
        self.click(app, "Chạy toàn bộ test")

        summary = app.table[-1].value.set_index("Chỉ số")
        self.assertEqual(summary["Trung bình"].to_dict(),
                         {"Precision": "44.13%", "Recall": "86.27%", "F1": "57.35%",
                          "RMSE (phút)": "37.93", "Độ phổ biến": "1199.88", "Sở thích": "4.40"})
        self.assertEqual(summary["Số chuyến"].tolist(), [17, 17, 17, 16, 16, 16])
        details = next(x.value for x in app.dataframe if "Chuyến test" in x.value).set_index("Chuyến test")
        self.assertEqual(len(details), 17)
        self.assertEqual(details.loc["38", "Trạng thái"], "Không có tuyến")
        self.assertEqual(details.loc["38", "F1"], 0)
        self.assertAlmostEqual(details.loc["733", "F1"], 6 / 7)

        self.click(app, "Sửa đầu vào")
        app.number_input(key="glasgow-budget").set_value(0).run()
        self.click(app, "Tính từng bước →")
        app.radio(key="stage").set_value(6).run()
        self.assertFalse(app.table)
        self.click(app, "Chạy toàn bộ test")
        summary = app.table[-1].value.set_index("Chỉ số")
        self.assertEqual(summary.loc["F1", "Trung bình"], "0.00%")
        self.assertEqual(summary.loc["RMSE (phút)", "Trung bình"], "—")
        self.assertEqual(summary["Số chuyến"].tolist(), [17, 17, 17, 0, 0, 0])


if __name__ == "__main__":
    unittest.main()
