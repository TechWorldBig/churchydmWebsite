import { Component, type ErrorInfo, type ReactNode } from 'react'
import { systemErrorStatus, type SystemErrorStatus } from '../data/systemError'
import SystemErrorPage from './SystemErrorPage'

type Props = { children: ReactNode }
type State = { failed: boolean; status: SystemErrorStatus }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, status: 500 }

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, status: systemErrorStatus(error) }
  }

  componentDidCatch(_error: unknown, info: ErrorInfo) {
    // Keep private error details out of the UI while preserving a useful
    // same-origin diagnostic for deployment logs and browser tooling.
    console.error('Application rendering failed', { componentStack: info.componentStack })
  }

  render() {
    return this.state.failed ? <SystemErrorPage status={this.state.status} /> : this.props.children
  }
}
