"""Chapter 9: event ordering simulation; no audio, GUI, robot or network is used."""
class Session:
    def __init__(self):
        self.epoch = 0
        self.partial = ""
        self.accepted = []

    def begin(self):
        self.epoch += 1
        self.partial = ""
        return self.epoch

    def interrupt(self):
        self.epoch += 1
        self.partial = ""

    def receive(self, epoch, text, final=False):
        if epoch != self.epoch:
            return "discarded"
        self.partial += text
        if final:
            self.accepted.append(self.partial)
            self.partial = ""
        return "accepted"


if __name__ == "__main__":
    session = Session()
    old = session.begin()
    session.receive(old, "尚未完成的旧回答")
    session.interrupt()
    new = session.begin()
    print("旧请求迟到结果：", session.receive(old, "继续旧回答", final=True))
    print("新请求结果：", session.receive(new, "只保留新任务结果", final=True))
    assert session.accepted == ["只保留新任务结果"]
    print("已接受：", session.accepted)
