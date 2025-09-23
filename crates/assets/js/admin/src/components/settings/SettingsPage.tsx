import { createSignal, For, Show, Switch, Match } from "solid-js";
import type { Component, Signal } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { createForm } from "@tanstack/solid-form";
import { TbRefresh } from "solid-icons/tb";
import { useQueryClient } from "@tanstack/solid-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { TextField, TextFieldLabel } from "@/components/ui/text-field";
import { showToast } from "@/components/ui/toast";

import { Config, ServerConfig } from "@proto/config";
import {
  notEmptyValidator,
  unsetOrValidUrl,
  buildOptionalNumberFormField,
  buildTextFormField,
  buildOptionalTextFormField,
  gapStyle,
} from "@/components/FormFields";
import { Header } from "@/components/Header";
import { ConfirmCloseDialog } from "@/components/SafeSheet";
import { AuthSettings } from "@/components/settings/AuthSettings";
import { SchemaSettings } from "@/components/settings/SchemaSettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { JobSettings } from "@/components/settings/JobSettings";
import { SplitView } from "@/components/SplitView";
import { IconButton } from "@/components/IconButton";
import { Version } from "@/components/Version";

import {
  createConfigQuery,
  setConfig,
  invalidateAllAdminQueries,
} from "@/lib/config";
import { createVersionInfoQuery } from "@/lib/info";

function ServerSettings(props: CommonProps) {
  const queryClient = useQueryClient();
  const config = createConfigQuery();
  const versionInfo = createVersionInfoQuery();

  const Form = (p: { config: ServerConfig }) => {
    const form = createForm(() => ({
      defaultValues: p.config satisfies ServerConfig,
      onSubmit: async ({ value }: { value: ServerConfig }) => {
        const c = config.data?.config;
        if (!c) {
          console.warn("Missing base config:");
          return;
        }

        const newConfig = Config.fromPartial(c);
        newConfig.server = value;
        await setConfig(queryClient, newConfig);

        props.postSubmit?.();
      },
    }));

    form.useStore((state) => {
      if (state.isDirty && !state.isSubmitted) {
        props.markDirty();
      }
    });

    return (
      <form
        method="dialog"
        onSubmit={(e: SubmitEvent) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <div class="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <h2>Settings</h2>
            </CardHeader>

            <CardContent class="flex flex-col gap-4">
              <div>
                <form.Field
                  name="applicationName"
                  validators={notEmptyValidator()}
                >
                  {buildTextFormField({
                    label: () => <div class={labelWidth}>App Name</div>,
                    info: (
                      <p>
                        The name of your application, e.g. used in mails sent to
                        users when singing up.
                      </p>
                    ),
                  })}
                </form.Field>
              </div>

              <div>
                <form.Field name="siteUrl" validators={unsetOrValidUrl()}>
                  {buildOptionalTextFormField({
                    label: () => <div class={labelWidth}>Site URL</div>,
                    placeholder: "https://trailbase.io",
                    info: (
                      <p>
                        The public URL of your server, e.g. used for auth
                        redirects, email verification links.
                      </p>
                    ),
                  })}
                </form.Field>
              </div>

              <div>
                <form.Field name="logsRetentionSec">
                  {buildOptionalNumberFormField({
                    integer: true,
                    label: () => (
                      <div class={labelWidth}>Log Retention (sec)</div>
                    ),
                    info: (
                      <p>
                        A background job periodically cleans up logs older than
                        the above retention period. Setting the retention to
                        zero turns off the cleanup retaining logs indefinitely.
                      </p>
                    ),
                  })}
                </form.Field>
              </div>
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            {import.meta.env.DEV && (
              <Button
                variant={"destructive"}
                type="button"
                onClick={() => {
                  throw new Date().toLocaleString();
                }}
              >
                DEV: Throw
              </Button>
            )}

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {(state) => {
                return (
                  <Button
                    type="submit"
                    disabled={!state().canSubmit}
                    variant="default"
                  >
                    {state().isSubmitting ? "..." : "Submit"}
                  </Button>
                );
              }}
            </form.Subscribe>
          </div>
        </div>
      </form>
    );
  };

  const serverConfig = () => {
    const c = config.data?.config?.server;
    if (c) {
      // "deep-copy"
      return ServerConfig.decode(ServerConfig.encode(c).finish());
    }
    // Fallback
    return ServerConfig.fromJSON({});
  };

  const width = "w-40";

  return (
    <div class="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <h2>Info</h2>
        </CardHeader>

        <CardContent class="flex flex-col gap-4">
          <Switch>
            <Match when={versionInfo.error}>
              {versionInfo.error?.toString()}
            </Match>

            <Match when={versionInfo.isLoading}>Loading...</Match>

            <Match when={versionInfo.data}>
              <TextField class="w-full">
                <div
                  class={`grid items-center ${gapStyle}`}
                  style={{ "grid-template-columns": "auto 1fr" }}
                >
                  <TextFieldLabel class={width}>CPU Threads:</TextFieldLabel>
                  <span>{versionInfo.data?.threads}</span>

                  <TextFieldLabel class={width}>Compiler:</TextFieldLabel>
                  <span>{versionInfo.data?.compiler}</span>

                  <TextFieldLabel class={width}>Commit Hash:</TextFieldLabel>
                  <span>
                    <a
                      href={`https://github.com/trailbaseio/trailbase/commit/${versionInfo.data?.commit_hash}`}
                    >
                      {versionInfo.data?.commit_hash?.substring(0, 10)}
                    </a>
                  </span>

                  <TextFieldLabel class={width}>Commit Date:</TextFieldLabel>
                  <span>{versionInfo.data?.commit_date}</span>

                  <TextFieldLabel class={width}>Version:</TextFieldLabel>
                  <span>
                    <Version info={versionInfo.data} />
                  </span>

                  <TextFieldLabel class={width}>Arguments:</TextFieldLabel>
                  <span class="font-mono">
                    {versionInfo.data?.command_line_arguments?.join(" ")}
                  </span>
                </div>
              </TextField>
            </Match>
          </Switch>
        </CardContent>
      </Card>

      <Show when={config.isError}>Failed to fetch config</Show>

      <Show when={config.isLoading}>Loading</Show>

      <Show when={config.isSuccess}>
        <Form config={serverConfig()} />
      </Show>
    </div>
  );
}

function ImportSettings(props: CommonProps) {
  const queryClient = useQueryClient();
  const config = createConfigQuery();

  const Form = (p: { config: ServerConfig }) => {
    const form = createForm(() => ({
      defaultValues: p.config satisfies ServerConfig,
      onSubmit: async ({ value }: { value: ServerConfig }) => {
        const c = config.data?.config;
        if (!c) {
          console.warn("Missing base config:");
          return;
        }

        const newConfig = Config.fromPartial(c);
        newConfig.server = value;
        await setConfig(queryClient, newConfig);

        props.postSubmit();
      },
    }));

    form.useStore((state) => {
      if (state.isDirty) {
        props.markDirty();
      }
    });

    return (
      <form
        method="dialog"
        onSubmit={(e: SubmitEvent) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <div class="flex flex-col gap-4">
          <Card class="text-sm">
            <CardHeader>
              <h2>Import {"&"} Export</h2>
            </CardHeader>

            <CardContent>
              <p class="mt-2">
                Importing and exporting data via the UI is not yet supported.
                Instead, you can use the <span class="font-mono">sqlite3</span>{" "}
                command line interface. TrailBase does not require any special
                metadata. Any <span class="font-mono">STRICT</span>ly typed{" "}
                <span class="font-mono">TABLE</span> with an
                <span class="font-mono">INTEGER</span> or UUID primary key can
                be exposed via TrailBase's Record APIs.
              </p>

              <p class="my-2">Import, e.g.:</p>
              <pre class="ml-4 whitespace-pre-wrap">
                $ cat import_data.sql | sqlite3 traildepot/data/main.db
              </pre>

              <p class="my-2">Export, e.g.:</p>

              <pre class="ml-4 whitespace-pre-wrap">
                $ sqlite3 traildepot/data/main.db
                <br />
                sqlite&gt; .output dump.db
                <br />
                sqlite&gt; .dump
                <br />
              </pre>
            </CardContent>
          </Card>
        </div>
      </form>
    );
  };

  const serverConfig = () => {
    const c = config.data?.config?.server;
    if (c) {
      // "deep-copy"
      return ServerConfig.decode(ServerConfig.encode(c).finish());
    }
    // Fallback
    return ServerConfig.fromJSON({});
  };

  return (
    <>
      <Show when={config.isError}>Failed to fetch config</Show>

      <Show when={config.isLoading}>Loading</Show>

      <Show when={config.isSuccess}>
        <Form config={serverConfig()} />
      </Show>
    </>
  );
}

function Sidebar(props: {
  activeRoute: string | undefined;
  horizontal: boolean;
  dirty: Signal<boolean>;
}) {
  const navigate = useNavigate();
  // eslint-disable-next-line solid/reactivity
  const [dirty, setDirty] = props.dirty;

  return (
    <div class={`${props.horizontal ? "flex flex-col" : "flex"} gap-2 p-4`}>
      <For each={sites}>
        {(s: Site) => {
          const [dialogOpen, setDialogOpen] = createSignal(false);
          const match = () => props.activeRoute === s.route;

          return (
            <Dialog
              id="confirm"
              modal={true}
              open={dialogOpen()}
              onOpenChange={setDialogOpen}
            >
              <ConfirmCloseDialog
                back={() => setDialogOpen(false)}
                confirm={() => {
                  setDialogOpen(false);
                  setDirty(false);
                  navigate("/settings/" + s.route);
                }}
              />

              <Button
                class="text-nowrap"
                variant={match() ? "default" : "outline"}
                onClick={() => {
                  if (!match()) {
                    if (!dirty()) {
                      navigate("/settings/" + s.route);
                      return;
                    }

                    setDialogOpen(true);
                  }
                }}
              >
                {s.label}
              </Button>
            </Dialog>
          );
        }}
      </For>
    </div>
  );
}

interface CommonProps {
  markDirty: () => void;
  postSubmit: () => void;
}

interface Site {
  route: string;
  label: string;
  child: Component<CommonProps>;
}

const sites = [
  {
    route: "host",
    label: "Host",
    child: ServerSettings,
  },
  {
    route: "email",
    label: "Email",
    child: EmailSettings,
  },
  {
    route: "auth",
    label: "Auth",
    child: AuthSettings,
  },
  {
    route: "jobs",
    label: "Jobs",
    child: JobSettings,
  },
  {
    route: "schema",
    label: "Schemas",
    child: SchemaSettings,
  },
  {
    route: "data",
    label: "Data",
    child: ImportSettings,
  },
] as const;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ group: string }>();
  const [dirty, setDirty] = createSignal(false);

  const activeSite = () => {
    const g = params?.group;
    if (g) {
      return sites.find((s) => s.route == g) ?? sites[0];
    }
    return sites[0];
  };

  const First = (props: { horizontal: boolean }) => (
    <Sidebar
      horizontal={props.horizontal}
      activeRoute={activeSite().route}
      dirty={[dirty, setDirty]}
    />
  );

  function Second() {
    const p = () =>
      ({
        markDirty: () => setDirty(true),
        postSubmit: () => {
          setDirty(false);
          showToast({
            title: "submitted",
            variant: "success",
          });
        },
      }) as CommonProps;

    return (
      <>
        <Header
          title="Settings"
          titleSelect={activeSite().label}
          left={
            <IconButton onClick={() => invalidateAllAdminQueries(queryClient)}>
              <TbRefresh size={18} />
            </IconButton>
          }
        />

        <div class="m-4">{activeSite().child(p())}</div>
      </>
    );
  }

  return <SplitView first={First} second={Second} />;
}

const labelWidth = "w-40";
