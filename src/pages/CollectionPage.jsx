import React from "react";
import CollectionDevelopmentExamples from "../components/CollectionDevelopmentExamples.jsx";
import CollectionProjectOverview, {
  CollectionRequirements,
} from "../components/CollectionProjectOverview.jsx";
import CollectionIdentityDrawer from "../components/CollectionIdentityDrawer.jsx";
import CollectionTaskDetail, {
  CollectionTaskFooter,
  CollectionTaskHeader,
} from "../components/CollectionTaskDetail.jsx";
import CollectionTaskDrawer from "../components/CollectionTaskDrawer.jsx";
import CollectionRecordCard from "../components/CollectionRecordCard.jsx";
import CollectionPaymentDrawer from "../components/CollectionPaymentDrawer.jsx";
import CollectionRecords from "../components/CollectionRecords.jsx";
import CollectionProjects from "../components/CollectionProjects.jsx";
import CollectionNotifications from "../components/CollectionNotifications.jsx";
import CollectionNotice from "../components/CollectionNotice.jsx";
import { CollectionIcon } from "../components/CollectionHome.jsx";
import CollectionHome from "../components/CollectionHome.jsx";
import CollectionServices from "../components/CollectionServices.jsx";
import CollectionNavigation from "../components/CollectionNavigation.jsx";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function CollectionPage({ scope, args = [] }) {
  return (
    <Controller name="collectionFlow" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page collection-page"
          id="collection-page"
          data-view={s.view}
          data-task-status={s.isRecordView ? s.statusKey : undefined}
          data-task-tone={s.isRecordView ? s.status.tone : undefined}
          show={s.page === "collection"}
          aria-label="专项采集"
        >
          {import.meta.env.DEV && <CollectionDevelopmentExamples scope={s} />}
          <View
            as="header"
            scope={s}
            className="collection-nav"
            show={
              !s.isSection &&
              !["projects", "notifications", "detail", "complete"].includes(
                s.view,
              )
            }
            inert={!!s.panel}
          >
            <View
              as="button"
              scope={s}
              disabled={s.busy}
              aria-label="返回"
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.back();
                  },
                },
              ]}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-chevron-left"></View>
              </View>
            </View>
            <View
              as="h1"
              scope={s}
              text={
                s.view === "home"
                  ? ""
                  : s.view === "project"
                    ? ""
                    : s.view === "records"
                      ? "采集记录"
                      : s.view === "complete"
                        ? "采集完成"
                        : "采集详情"
              }
            ></View>
          </View>
          <CollectionTaskHeader scope={s} />
          <View
            as="div"
            scope={s}
            className="collection-scroll"
            refName="collectionScroll"
            inert={!!s.panel}
          >
            <CollectionHome scope={s} />
            <CollectionProjects scope={s} />
            <CollectionNotifications scope={s} />
            <CollectionServices scope={s} />
            <CollectionProjectOverview scope={s} />
            <CollectionRecords scope={s} />
            <CollectionTaskDetail scope={s} />
            <View
              as="div"
              scope={s}
              className="collection-empty"
              show={
                s.recordsStore.ready &&
                ["detail", "complete"].includes(s.view) &&
                !s.current
              }
            >
              <View as="p" scope={s}>
                {"未找到这条采集记录"}
              </View>
              <View
                as="button"
                scope={s}
                className="account-text"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.route("records");
                    },
                  },
                ]}
              >
                {"返回采集记录"}
              </View>
            </View>
            <View
              as="p"
              scope={s}
              className="collection-error"
              show={
                (s.error || s.recordsStore.error) &&
                !(["detail", "complete"].includes(s.view) && s.current)
              }
              text={s.error || s.recordsStore.error}
              role="alert"
            ></View>
            <View
              as="button"
              scope={s}
              className="account-text"
              show={
                s.recordsStore.error &&
                !(["detail", "complete"].includes(s.view) && s.current)
              }
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.recordsStore.load();
                  },
                },
              ]}
            >
              {"重新读取"}
            </View>
            <View
              as="p"
              scope={s}
              className="collection-empty"
              show={!s.recordsStore.ready && !s.recordsStore.error}
            >
              {"正在读取采集记录…"}
            </View>
          </View>
          <CollectionNotice scope={s} />
          <CollectionNavigation scope={s} />
          <View
            as="footer"
            scope={s}
            className="collection-action-footer"
            inert={!!s.panel}
            show={s.view === "project"}
          >
            <View
              as="button"
              scope={s}
              className="collection-primary"
              disabled={s.disabled || !s.canCollect}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.begin();
                  },
                },
              ]}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-camera"></View>
              </View>
              {s.canCollect ? "开始采集" : s.projectState.label}
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-arrow"></View>
              </View>
            </View>
          </View>
          <CollectionTaskFooter scope={s} />
          <Portal target="#collection-modal-layer">
            <View
              as="div"
              scope={s}
              className="collection-overlay"
              show={s.page === "collection" && s.panel}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: true,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.closePanel();
                  },
                },
                {
                  type: "keydown",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.trap($event);
                  },
                },
              ]}
            >
              <CollectionPaymentDrawer scope={s} />
              <CollectionIdentityDrawer scope={s} />
              <CollectionTaskDrawer scope={s} />
              {!s.isAuthPanel && !s.isTaskPanel && s.panel !== "payment" && (
                <View
                  as="section"
                  scope={s}
                  className="collection-drawer"
                  data-panel={s.panel}
                  refName="collectionDialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="collection-drawer-title"
                >
                  <View as="header" scope={s}>
                    <View
                      as="span"
                      scope={s}
                      className="collection-drawer-symbol"
                      aria-hidden="true"
                    >
                      <View as="svg" scope={s}>
                        <View
                          as="use"
                          scope={s}
                          href={
                            s.panel === "email"
                              ? "#i-nav-service"
                              : s.panel === "requirements"
                                ? "#i-document"
                                : "#i-collection-id"
                          }
                        ></View>
                      </View>
                    </View>
                    <View
                      as="h2"
                      scope={s}
                      id="collection-drawer-title"
                      text={s.panelTitle}
                    ></View>
                    <View
                      as="button"
                      scope={s}
                      disabled={s.busy}
                      aria-label="关闭"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.closePanel();
                          },
                        },
                      ]}
                    >
                      <View as="svg" scope={s} aria-hidden="true">
                        <View as="use" scope={s} href="#i-close"></View>
                      </View>
                    </View>
                  </View>
                  <View as="div" scope={s} className="collection-drawer-body">
                    {s.panel === "requirements" && (
                      <section className="collection-requirements-sheet">
                        <p className="collection-requirements-project">
                          {s.project.name}
                        </p>
                        <CollectionRequirements
                          items={s.project.requirements}
                        />
                      </section>
                    )}

                    {s.panel === "email" && (
                      <div className="collection-email-confirm">
                        <p>是否打开邮箱联系知拍客服？</p>
                        <span>zpai_service@163.com</span>
                        <div className="collection-email-actions">
                          <button
                            className="collection-secondary"
                            onClick={() => s.closePanel()}
                          >
                            取消
                          </button>
                          <a
                            className="collection-primary"
                            href={s.emailLink}
                            onClick={(event) => {
                              if (!s.confirmEmailContact())
                                event.preventDefault();
                            }}
                          >
                            打开邮箱
                          </a>
                        </div>
                      </div>
                    )}

                    <View as="div" scope={s} show={s.panel === "existing"}>
                      <View as="div" scope={s} className="collection-matched">
                        <View as="svg" scope={s} aria-hidden="true">
                          <View as="use" scope={s} href="#i-check"></View>
                        </View>
                        {"身份匹配成功"}
                      </View>
                      <View
                        as="article"
                        scope={s}
                        className="collection-record-card"
                      >
                        <View as="h3" scope={s} text={s.current?.name}></View>
                        <View as="p" scope={s} text={s.project.name}></View>
                        <View
                          as="span"
                          scope={s}
                          className="collection-chip"
                          text={s.status.label}
                        ></View>
                        <View as="p" scope={s}>
                          {"已存在该项目的采集记录，可继续办理。"}
                        </View>
                      </View>
                      <View
                        as="button"
                        scope={s}
                        className="collection-primary"
                        disabled={s.busy}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.openRecord(scope.current);
                            },
                          },
                        ]}
                      >
                        {"继续采集"}
                      </View>
                    </View>
                    <View
                      as="div"
                      scope={s}
                      show={s.panel === "projectRecords"}
                    >
                      <div className="collection-project-records-list">
                        {s.projectRecords.map((record) => (
                          <CollectionRecordCard
                            key={record.id}
                            scope={s}
                            record={record}
                          />
                        ))}
                      </div>
                      <View
                        as="p"
                        scope={s}
                        className="collection-empty"
                        show={!s.projectRecords.length}
                      >
                        {"此项目还没有采集记录"}
                      </View>
                    </View>
                    <View
                      as="p"
                      scope={s}
                      className="collection-error"
                      show={s.error}
                      text={s.error}
                      role="alert"
                    ></View>
                  </View>
                </View>
              )}
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
